from typing import Annotated, Literal

from fastapi import APIRouter, Header, Query, Request

from app.config import get_settings
from app.deps import DB, client_ip
from app.models import Order
from app.schemas import (
    CancelIn,
    CartQuoteIn,
    CartQuoteOut,
    CheckoutIn,
    CollectionWithCount,
    OrderLookupIn,
    OrderLookupOut,
    OrderOut,
    OrderTimelineEntry,
    PayIn,
    PayOut,
    ProductDetail,
    ProductPage,
    ShippingOptionOut,
)
from app.security import lookup_limiter, payment_limiter
from app.services import catalog, orders, payments, pricing

router = APIRouter(prefix="/api/v1", tags=["storefront"])


def order_out(order: Order) -> OrderOut:
    out = OrderOut.model_validate(order)
    out.payment_mode = get_settings().payment_provider
    return out


@router.get("/products", response_model=ProductPage)
def list_products(
    db: DB,
    q: str | None = Query(None, max_length=100),
    category: Annotated[list[str] | None, Query()] = None,
    color: Annotated[list[str] | None, Query()] = None,
    collection: str | None = None,
    min_price: int | None = Query(None, ge=0, description="paise"),
    max_price: int | None = Query(None, ge=0, description="paise"),
    in_stock: bool = False,
    featured: bool = False,
    sort: Literal["featured", "newest", "price_asc", "price_desc", "name"] = "featured",
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(12, ge=1, le=48),
) -> ProductPage:
    return catalog.list_products(
        db, q=q, categories=category, colors=color, collection_slug=collection,
        min_price=min_price, max_price=max_price, in_stock=in_stock, featured=featured,
        sort=sort, page=page, page_size=page_size,
    )  # fmt: skip


@router.get("/products/{slug}", response_model=ProductDetail)
def product_detail(slug: str, db: DB) -> ProductDetail:
    return catalog.get_product_detail(db, slug)


@router.get("/collections", response_model=list[CollectionWithCount])
def collections(db: DB) -> list[CollectionWithCount]:
    out = []
    for c in catalog.list_collections(db):
        n = sum(1 for p in c.products if p.is_active)
        out.append(CollectionWithCount(**{**c.__dict__, "product_count": n}))
    return out


@router.get("/shipping-options", response_model=list[ShippingOptionOut])
def shipping_options(db: DB, subtotal_paise: int = Query(0, ge=0)) -> list[ShippingOptionOut]:
    return [pricing.shipping_option_out(m, subtotal_paise) for m in pricing.active_shipping_methods(db)]


@router.post("/cart/quote", response_model=CartQuoteOut)
def cart_quote(body: CartQuoteIn, db: DB) -> CartQuoteOut:
    return pricing.quote_cart(db, body.items, body.shipping_method)


@router.post("/checkout/orders", response_model=OrderOut, status_code=201)
def create_order(
    body: CheckoutIn,
    db: DB,
    idempotency_key: Annotated[str | None, Header(min_length=8, max_length=80)] = None,
) -> OrderOut:
    return order_out(orders.create_order(db, body, idempotency_key))


@router.post("/orders/lookup", response_model=OrderLookupOut)
def lookup_order(body: OrderLookupIn, db: DB, request: Request) -> OrderLookupOut:
    lookup_limiter.check(client_ip(request))
    order = orders.find_customer_order(db, body.reference, body.email)
    out = OrderLookupOut.model_validate(order)
    out.payment_mode = get_settings().payment_provider
    out.timeline = [
        OrderTimelineEntry(status=e.to_status, at=e.created_at)
        for e in order.events
        if e.kind in ("status", "payment") and e.to_status
    ]
    return out


@router.post("/orders/{reference}/pay", response_model=PayOut)
def pay(reference: str, body: PayIn, db: DB, request: Request) -> PayOut:
    payment_limiter.check(client_ip(request))
    order, payment, success = payments.pay_order(db, reference, body.email, body.attempt_key, body.demo_outcome)
    msg = (
        "Demo payment successful. No money was charged."
        if success
        else (payment.failure_reason if payment else "Payment failed")
    )
    return PayOut(success=success, message=msg, order=order_out(order))


@router.post("/orders/{reference}/cancel", response_model=OrderOut)
def cancel(reference: str, body: CancelIn, db: DB) -> OrderOut:
    return order_out(orders.customer_cancel(db, reference, body.email))
