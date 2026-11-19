"""Order lifecycle: creation, stock reservation, cancellation, admin transitions."""

import logging
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import AppError, bad_request, conflict, not_found
from app.logging_config import log_event
from app.models import Order, OrderEvent, OrderItem, OrderStatus, PaymentStatus, Product
from app.schemas import CheckoutIn
from app.services.pricing import (
    get_shipping_method,
    merge_items,
    shipping_cost,
)

log = logging.getLogger("app.orders")

_REF_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # no 0/O/1/I/L

# Admin-driven transitions. pending_payment -> new happens only via a successful payment.
ALLOWED_TRANSITIONS: dict[str, set[str]] = {
    OrderStatus.PENDING_PAYMENT: {OrderStatus.CANCELLED},
    OrderStatus.NEW: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PACKED, OrderStatus.CANCELLED},
    OrderStatus.PACKED: {OrderStatus.SHIPPED, OrderStatus.CANCELLED},
    OrderStatus.SHIPPED: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: set(),
    OrderStatus.CANCELLED: set(),
}


def allowed_transitions(order: Order) -> list[str]:
    return sorted(str(s) for s in ALLOWED_TRANSITIONS.get(order.status, set()))


def _new_reference(db: Session) -> str:
    while True:
        ref = "VM-" + "".join(secrets.choice(_REF_ALPHABET) for _ in range(8))
        if not db.scalar(select(Order.id).where(Order.reference == ref)):
            return ref


def add_event(
    order: Order,
    kind: str,
    *,
    from_status: str = "",
    to_status: str = "",
    note: str = "",
    actor: str = "system",
) -> None:
    order.events.append(OrderEvent(kind=kind, from_status=from_status, to_status=to_status, note=note, actor=actor))


def _lock_products(db: Session, ids: list[int]) -> dict[int, Product]:
    """Row-lock products in id order (consistent order prevents deadlocks)."""
    rows = db.scalars(select(Product).where(Product.id.in_(ids)).order_by(Product.id).with_for_update())
    return {p.id: p for p in rows}


def restore_stock(db: Session, order: Order) -> None:
    if not order.stock_reserved:
        return
    products = _lock_products(db, sorted({i.product_id for i in order.items}))
    for item in order.items:
        products[item.product_id].stock += item.quantity
    order.stock_reserved = False


def create_order(db: Session, data: CheckoutIn, idempotency_key: str | None) -> Order:
    """Atomically validate, price, reserve stock and create a pending_payment order."""
    release_expired(db)
    method = get_shipping_method(db, data.shipping_method)
    if method.requires_address and data.address is None:
        raise bad_request("address_required", "A shipping address is required for this delivery option")
    wanted = merge_items(data.items)
    products = _lock_products(db, sorted(wanted))

    if idempotency_key:
        existing = db.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
        if existing:
            if existing.email.lower() != data.contact.email.lower():
                raise conflict("idempotency_mismatch", "This checkout key was used for another order")
            return existing

    problems = []
    for pid, qty in wanted.items():
        p = products.get(pid)
        if p is None or not p.is_active:
            problems.append(
                {"product_id": pid, "name": p.name if p else "Unknown", "reason": "unavailable",
                 "available": 0, "requested": qty}
            )  # fmt: skip
        elif p.stock < qty:
            problems.append(
                {"product_id": pid, "name": p.name, "reason": "insufficient_stock",
                 "available": p.stock, "requested": qty}
            )  # fmt: skip
    if problems:
        log_event(log, logging.WARNING, "checkout_stock_conflict", problems=problems)
        raise conflict(
            "stock_unavailable",
            "Some items are no longer available in the requested quantity",
            problems,
        )

    subtotal = sum(products[pid].price_paise * qty for pid, qty in wanted.items())
    ship = shipping_cost(method, subtotal)
    now = datetime.now(UTC)
    addr = data.address
    order = Order(
        reference=_new_reference(db),
        idempotency_key=idempotency_key,
        status=OrderStatus.PENDING_PAYMENT,
        payment_status=PaymentStatus.UNPAID,
        stock_reserved=True,
        reservation_expires_at=now + timedelta(minutes=get_settings().reservation_minutes),
        customer_name=data.contact.name,
        email=str(data.contact.email).lower(),
        phone=data.contact.phone,
        address_line1=addr.line1 if addr and method.requires_address else "",
        address_line2=addr.line2 if addr and method.requires_address else "",
        city=addr.city if addr and method.requires_address else "",
        state=addr.state if addr and method.requires_address else "",
        pincode=addr.pincode if addr and method.requires_address else "",
        subtotal_paise=subtotal,
        shipping_paise=ship,
        total_paise=subtotal + ship,
        shipping_method_code=method.code,
        shipping_method_label=method.label,
    )
    for pid, qty in wanted.items():
        p = products[pid]
        p.stock -= qty  # guarded by row lock + CHECK (stock >= 0)
        order.items.append(OrderItem(product_id=pid, product_name=p.name, unit_price_paise=p.price_paise, quantity=qty))
    add_event(order, "status", to_status=OrderStatus.PENDING_PAYMENT, note="Order placed")
    db.add(order)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if idempotency_key:
            existing = db.scalar(select(Order).where(Order.idempotency_key == idempotency_key))
            if existing:
                return existing
        log_event(log, logging.ERROR, "order_create_integrity_error", error=str(exc.orig))
        raise conflict("stock_unavailable", "Items are no longer available") from exc
    log_event(log, logging.INFO, "order_created", reference=order.reference, total=order.total_paise)
    return order


def find_customer_order(db: Session, reference: str, email: str, lock: bool = False) -> Order:
    stmt = select(Order).where(Order.reference == reference.strip().upper())
    if lock:
        stmt = stmt.with_for_update()
    order = db.scalar(stmt)
    # identical error for unknown reference and wrong e-mail (no enumeration)
    if not order or order.email.lower() != email.strip().lower():
        raise not_found("We could not find an order with that reference and email")
    return order


def cancel_order(db: Session, order: Order, *, actor: str, note: str) -> None:
    """Cancel (caller holds the order row lock). Releases reserved stock."""
    prev = order.status
    restore_stock(db, order)
    order.status = OrderStatus.CANCELLED
    if order.payment_status == PaymentStatus.PAID:
        order.payment_status = PaymentStatus.REFUND_DUE
    add_event(order, "status", from_status=prev, to_status=OrderStatus.CANCELLED, note=note, actor=actor)


def customer_cancel(db: Session, reference: str, email: str) -> Order:
    order = find_customer_order(db, reference, email, lock=True)
    if order.status == OrderStatus.CANCELLED:
        return order
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise conflict("not_cancellable", "Only unpaid orders can be cancelled online")
    cancel_order(db, order, actor="customer", note="Cancelled by customer before payment")
    db.commit()
    return order


def release_expired(db: Session) -> int:
    """Cancel unpaid orders whose stock reservation has lapsed and return their stock."""
    now = datetime.now(UTC)
    stale = db.scalars(
        select(Order)
        .where(
            Order.status == OrderStatus.PENDING_PAYMENT,
            Order.reservation_expires_at < now,
        )
        .order_by(Order.id)
        .with_for_update(skip_locked=True)
    ).all()
    for order in stale:
        cancel_order(db, order, actor="system", note="Payment window expired; stock released")
        log_event(log, logging.INFO, "reservation_expired", reference=order.reference)
    if stale:
        db.commit()
    return len(stale)


def transition_order(
    db: Session,
    order_id: int,
    to_status: str,
    *,
    tracking_reference: str | None,
    note: str | None,
    actor: str,
) -> Order:
    order = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if not order:
        raise not_found("Order not found")
    allowed = ALLOWED_TRANSITIONS.get(order.status, set())
    if to_status not in allowed:
        raise conflict(
            "invalid_transition",
            f"Cannot move an order from '{order.status}' to '{to_status}'",
            {"from": order.status, "to": to_status, "allowed": allowed_transitions(order)},
        )
    if tracking_reference is not None:
        order.tracking_reference = tracking_reference.strip()
    if to_status == OrderStatus.SHIPPED and order.address_line1 and not order.tracking_reference:
        raise AppError(422, "tracking_required", "Enter a tracking reference before marking as shipped")
    if order.payment_status != PaymentStatus.PAID and to_status not in (OrderStatus.CANCELLED,):
        raise conflict("unpaid", "Only paid orders can be fulfilled")
    prev = order.status
    if to_status == OrderStatus.CANCELLED:
        cancel_order(db, order, actor=actor, note=note or "Cancelled by admin")
    else:
        order.status = to_status
        add_event(order, "status", from_status=prev, to_status=to_status, note=note or "", actor=actor)
    db.commit()
    log_event(log, logging.INFO, "order_transition", reference=order.reference, frm=prev, to=to_status)
    return order
