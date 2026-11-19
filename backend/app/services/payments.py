"""Payment provider boundary + order payment state machine.

Only a DEMO provider exists. It simulates an outcome and never touches money or card
data. A real gateway (e.g. Razorpay) would implement `PaymentProvider` and, because it
confirms payments asynchronously, add a signed webhook that calls `apply_payment_result`.
"""

import logging
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.errors import AppError, conflict
from app.logging_config import log_event
from app.models import AttemptStatus, Order, OrderStatus, Payment, PaymentStatus
from app.services import orders as order_service

log = logging.getLogger("app.payments")


@dataclass(frozen=True)
class ProviderResult:
    success: bool
    provider_ref: str
    failure_reason: str = ""


class PaymentProvider(Protocol):
    name: str

    def charge(self, *, order_reference: str, amount_paise: int, attempt_key: str, simulate: str) -> ProviderResult: ...


class DemoProvider:
    """Simulated payment. `simulate` is 'success' or 'failure'. No money moves."""

    name = "demo"

    def charge(self, *, order_reference: str, amount_paise: int, attempt_key: str, simulate: str) -> ProviderResult:
        ref = "demo_" + secrets.token_hex(6)
        if simulate == "failure":
            return ProviderResult(False, ref, "Simulated payment failure (demo mode)")
        return ProviderResult(True, ref)


def get_provider() -> PaymentProvider:
    if get_settings().payment_provider == "demo":
        return DemoProvider()
    raise RuntimeError("Unsupported payment provider")  # guarded by Settings validation


def apply_payment_result(db: Session, order: Order, payment: Payment) -> None:
    """Single place where a payment outcome changes order state (order row is locked)."""
    if payment.status == AttemptStatus.SUCCEEDED:
        order.payment_status = PaymentStatus.PAID
        order.status = OrderStatus.NEW
        order.reservation_expires_at = None
        order_service.add_event(
            order, "payment", from_status=OrderStatus.PENDING_PAYMENT, to_status=OrderStatus.NEW,
            note=f"Payment received via {payment.provider} (demo, no money charged)"
            if payment.provider == "demo"
            else f"Payment received via {payment.provider}",
        )  # fmt: skip
    else:
        order.payment_status = PaymentStatus.FAILED
        order_service.add_event(order, "payment", note=f"Payment attempt failed: {payment.failure_reason}")


def pay_order(
    db: Session, reference: str, email: str, attempt_key: str, simulate: str
) -> tuple[Order, Payment | None, bool]:
    """Attempt payment. Returns (order, payment, success).

    Safe to repeat: the order row is locked, a paid order never takes a second payment,
    and the same attempt_key returns the earlier outcome without a new charge.
    """
    order = order_service.find_customer_order(db, reference, email, lock=True)

    existing = next((p for p in order.payments if p.attempt_key == attempt_key), None)
    if existing:
        return order, existing, existing.status == AttemptStatus.SUCCEEDED

    if order.payment_status == PaymentStatus.PAID:
        # already paid (e.g. double-click, second tab): report success, charge nothing
        paid = next(p for p in order.payments if p.status == AttemptStatus.SUCCEEDED)
        return order, paid, True
    if order.status == OrderStatus.CANCELLED:
        raise conflict("order_cancelled", "This order was cancelled. Please place a new order.")
    if order.status != OrderStatus.PENDING_PAYMENT:
        raise conflict("not_payable", "This order is not awaiting payment")
    if order.reservation_expires_at and order.reservation_expires_at < datetime.now(UTC):
        order_service.cancel_order(db, order, actor="system", note="Payment window expired; stock released")
        db.commit()
        raise AppError(
            409, "reservation_expired",
            "Your reservation expired and the items were released. Please check out again.",
        )  # fmt: skip

    result = get_provider().charge(
        order_reference=order.reference,
        amount_paise=order.total_paise,  # always the server-stored total
        attempt_key=attempt_key,
        simulate=simulate,
    )
    payment = Payment(
        provider=get_settings().payment_provider,
        provider_ref=result.provider_ref,
        attempt_key=attempt_key,
        status=AttemptStatus.SUCCEEDED if result.success else AttemptStatus.FAILED,
        amount_paise=order.total_paise,
        failure_reason=result.failure_reason,
    )
    order.payments.append(payment)
    apply_payment_result(db, order, payment)
    db.commit()
    log_event(
        log,
        logging.INFO if result.success else logging.WARNING,
        "payment_succeeded" if result.success else "payment_failed",
        reference=order.reference,
        provider=payment.provider,
        reason=result.failure_reason,
    )
    return order, payment, result.success


def latest_payment(db: Session, order: Order) -> Payment | None:
    return db.scalar(select(Payment).where(Payment.order_id == order.id).order_by(Payment.id.desc()))
