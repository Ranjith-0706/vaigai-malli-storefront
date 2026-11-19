"""Server-side cart pricing. The browser never supplies prices or totals."""

from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import bad_request
from app.models import Product, ShippingMethod
from app.schemas import (
    MAX_LINE_QTY,
    CartItemIn,
    CartLineOut,
    CartQuoteOut,
    ShippingOptionOut,
)


def merge_items(items: Sequence[CartItemIn]) -> dict[int, int]:
    """Merge duplicate product lines. Quantities are capped at MAX_LINE_QTY."""
    merged: dict[int, int] = {}
    for it in items:
        merged[it.product_id] = min(MAX_LINE_QTY, merged.get(it.product_id, 0) + it.quantity)
    return merged


def shipping_cost(method: ShippingMethod, subtotal_paise: int) -> int:
    if method.free_above_paise is not None and subtotal_paise >= method.free_above_paise:
        return 0
    return method.price_paise


def active_shipping_methods(db: Session) -> list[ShippingMethod]:
    return list(
        db.scalars(
            select(ShippingMethod)
            .where(ShippingMethod.is_active.is_(True))
            .order_by(ShippingMethod.sort_order, ShippingMethod.id)
        )
    )


def get_shipping_method(db: Session, code: str) -> ShippingMethod:
    m = db.scalar(select(ShippingMethod).where(ShippingMethod.code == code, ShippingMethod.is_active.is_(True)))
    if not m:
        raise bad_request("invalid_shipping_method", "Selected shipping option is not available")
    return m


def shipping_option_out(m: ShippingMethod, subtotal_paise: int) -> ShippingOptionOut:
    return ShippingOptionOut(
        code=m.code,
        label=m.label,
        description=m.description,
        price_paise=shipping_cost(m, subtotal_paise),
        requires_address=m.requires_address,
        free_above_paise=m.free_above_paise,
    )


def quote_cart(db: Session, items: Sequence[CartItemIn], shipping_code: str | None = None) -> CartQuoteOut:
    wanted = merge_items(items)
    products = {p.id: p for p in db.scalars(select(Product).where(Product.id.in_(wanted.keys())))}
    lines: list[CartLineOut] = []
    subtotal = 0
    for pid, qty in wanted.items():
        p = products.get(pid)
        if p is None or not p.is_active:
            lines.append(
                CartLineOut(
                    product_id=pid,
                    name=p.name if p else "Unavailable product",
                    requested_quantity=qty,
                    quantity=0,
                    max_quantity=0,
                    status="unavailable",
                )
            )
            continue
        max_q = min(p.stock, MAX_LINE_QTY)
        approved = min(qty, max_q)
        if max_q == 0:
            status = "out_of_stock"
        elif approved < qty:
            status = "reduced"
        else:
            status = "ok"
        line_total = approved * p.price_paise
        subtotal += line_total
        lines.append(
            CartLineOut(
                product_id=p.id,
                slug=p.slug,
                name=p.name,
                image_url=p.images[0].url if p.images else "",
                unit_price_paise=p.price_paise,
                requested_quantity=qty,
                quantity=approved,
                max_quantity=max_q,
                line_total_paise=line_total,
                status=status,
            )
        )
    methods = active_shipping_methods(db)
    options = [shipping_option_out(m, subtotal) for m in methods]
    chosen = next((m for m in methods if m.code == shipping_code), None) or (methods[0] if methods else None)
    ship = shipping_cost(chosen, subtotal) if chosen and subtotal > 0 else 0
    remaining = None
    flat = next((m for m in methods if m.free_above_paise is not None), None)
    if flat and flat.free_above_paise is not None and subtotal < flat.free_above_paise:
        remaining = flat.free_above_paise - subtotal
    return CartQuoteOut(
        lines=lines,
        subtotal_paise=subtotal,
        shipping_paise=ship,
        total_paise=subtotal + ship,
        shipping_method=chosen.code if chosen else "",
        shipping_options=options,
        has_issues=any(line.status != "ok" for line in lines),
        free_shipping_remaining_paise=remaining,
    )
