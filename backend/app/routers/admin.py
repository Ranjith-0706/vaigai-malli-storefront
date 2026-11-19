import logging
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from fastapi import APIRouter, Depends, File, Query, Request, Response, UploadFile
from sqlalchemy import func, or_, select

from app.config import get_settings
from app.deps import DB, CurrentAdmin, client_ip, require_admin
from app.errors import AppError, bad_request, not_found
from app.logging_config import log_event
from app.models import (
    AdminUser,
    Collection,
    Order,
    OrderStatus,
    PaymentStatus,
    Product,
    ProductImage,
    ShippingMethod,
)
from app.routers.public import order_out
from app.schemas import (
    AdminMe,
    CollectionIn,
    CollectionOut,
    DashboardOut,
    LoginIn,
    OrderAdminOut,
    OrderListItem,
    OrderListPage,
    OrderNotesIn,
    PaymentOut,
    ProductAdminOut,
    ProductIn,
    ShippingMethodAdminOut,
    ShippingMethodIn,
    TransitionIn,
)
from app.security import COOKIE_NAME, create_admin_token, login_limiter, verify_password
from app.services import catalog, orders
from app.services.catalog import slugify, to_summary

log = logging.getLogger("app.admin")

auth_router = APIRouter(prefix="/api/v1/admin/auth", tags=["admin-auth"])
router = APIRouter(prefix="/api/v1/admin", tags=["admin"], dependencies=[Depends(require_admin)])


# ---------------- auth ----------------
@auth_router.post("/login", response_model=AdminMe)
def login(body: LoginIn, db: DB, request: Request, response: Response) -> AdminMe:
    login_limiter.check(client_ip(request))
    admin = db.scalar(select(AdminUser).where(AdminUser.email == str(body.email).lower()))
    ok = verify_password(body.password, admin.password_hash if admin else None)
    if not admin or not admin.is_active or not ok:
        log_event(log, logging.WARNING, "admin_login_failed", ip=client_ip(request))
        raise AppError(401, "invalid_credentials", "Incorrect email or password")
    s = get_settings()
    response.set_cookie(
        COOKIE_NAME,
        create_admin_token(admin.id, admin.email),
        max_age=s.admin_session_hours * 3600,
        httponly=True,
        secure=s.cookie_secure,
        samesite="lax",
        path="/",
    )
    return AdminMe(id=admin.id, email=admin.email)


@auth_router.post("/logout", status_code=204)
def logout(response: Response) -> None:
    response.delete_cookie(COOKIE_NAME, path="/")


@auth_router.get("/me", response_model=AdminMe)
def me(admin: CurrentAdmin) -> AdminMe:
    return AdminMe(id=admin.id, email=admin.email)


# ---------------- dashboard ----------------
def _list_item(o: Order) -> OrderListItem:
    return OrderListItem(
        id=o.id, reference=o.reference, status=o.status, payment_status=o.payment_status,
        customer_name=o.customer_name, email=o.email, total_paise=o.total_paise,
        created_at=o.created_at, item_count=sum(i.quantity for i in o.items),
    )  # fmt: skip


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(db: DB) -> DashboardOut:
    orders.release_expired(db)
    by_status = dict(db.execute(select(Order.status, func.count()).group_by(Order.status)).all())
    for s in OrderStatus:
        by_status.setdefault(s.value, 0)
    revenue = db.scalar(
        select(func.coalesce(func.sum(Order.total_paise), 0)).where(
            Order.payment_status == PaymentStatus.PAID, Order.status != OrderStatus.CANCELLED
        )
    )
    week = db.scalar(
        select(func.count())
        .select_from(Order)
        .where(
            Order.created_at >= datetime.now(UTC) - timedelta(days=7),
            Order.status != OrderStatus.PENDING_PAYMENT,
        )
    )
    low = db.scalars(
        select(Product)
        .where(Product.is_active.is_(True), Product.stock <= 3)
        .order_by(Product.stock, Product.name)
        .limit(8)
    ).all()
    out_of_stock = db.scalar(
        select(func.count()).select_from(Product).where(Product.is_active.is_(True), Product.stock == 0)
    )
    active = db.scalar(select(func.count()).select_from(Product).where(Product.is_active.is_(True)))
    recent = db.scalars(
        select(Order).where(Order.status != OrderStatus.PENDING_PAYMENT)
        .order_by(Order.id.desc()).limit(6)
    ).all()  # fmt: skip
    return DashboardOut(
        orders_by_status=by_status,
        awaiting_action=by_status.get("new", 0) + by_status.get("confirmed", 0) + by_status.get("packed", 0),
        revenue_paise=int(revenue or 0),
        orders_last_7_days=int(week or 0),
        low_stock=[to_summary(p) for p in low],
        out_of_stock_count=int(out_of_stock or 0),
        active_products=int(active or 0),
        recent_orders=[_list_item(o) for o in recent],
    )


# ---------------- products ----------------
def _admin_product(p: Product) -> ProductAdminOut:
    detail = catalog.to_detail(p)
    return ProductAdminOut(**detail.model_dump(), is_active=p.is_active,
                           collection_id=p.collection_id, created_at=p.created_at)  # fmt: skip


def _unique_slug(db: DB, base: str, model: type[Product] | type[Collection], skip_id: int | None = None) -> str:
    slug, n = base, 1
    while True:
        stmt = select(model.id).where(model.slug == slug)
        if skip_id:
            stmt = stmt.where(model.id != skip_id)
        if not db.scalar(stmt):
            return slug
        n += 1
        slug = f"{base}-{n}"


def _check_collection(db: DB, collection_id: int | None) -> None:
    if collection_id is not None and not db.get(Collection, collection_id):
        raise bad_request("invalid_collection", "Collection does not exist")


@router.get("/products", response_model=list[ProductAdminOut])
def admin_products(
    db: DB,
    q: str | None = Query(None, max_length=100),
    status: str = Query("all", pattern="^(all|active|archived)$"),
) -> list[ProductAdminOut]:
    stmt = select(Product).order_by(Product.id.desc()).limit(500)
    if status == "active":
        stmt = stmt.where(Product.is_active.is_(True))
    elif status == "archived":
        stmt = stmt.where(Product.is_active.is_(False))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Product.name.ilike(like), Product.category.ilike(like)))
    return [_admin_product(p) for p in db.scalars(stmt)]


@router.get("/products/{product_id}", response_model=ProductAdminOut)
def admin_product(product_id: int, db: DB) -> ProductAdminOut:
    p = db.get(Product, product_id)
    if not p:
        raise not_found("Product not found")
    return _admin_product(p)


def _apply_product(p: Product, body: ProductIn) -> None:
    for f in ("name", "description", "category", "fabric", "color", "color_hex", "price_paise",
              "compare_at_paise", "stock", "care", "featured", "collection_id"):  # fmt: skip
        setattr(p, f, getattr(body, f))
    p.images = [ProductImage(url=i.url, alt=i.alt or body.name, position=n) for n, i in enumerate(body.images)]


@router.post("/products", response_model=ProductAdminOut, status_code=201)
def create_product(body: ProductIn, db: DB) -> ProductAdminOut:
    _check_collection(db, body.collection_id)
    if body.compare_at_paise is not None and body.compare_at_paise <= body.price_paise:
        raise bad_request("invalid_compare_price", "Compare-at price must be higher than the price")
    p = Product(slug=_unique_slug(db, body.slug or slugify(body.name), Product))
    _apply_product(p, body)
    db.add(p)
    db.commit()
    return _admin_product(p)


@router.put("/products/{product_id}", response_model=ProductAdminOut)
def update_product(product_id: int, body: ProductIn, db: DB) -> ProductAdminOut:
    p = db.scalar(select(Product).where(Product.id == product_id).with_for_update())
    if not p:
        raise not_found("Product not found")
    _check_collection(db, body.collection_id)
    if body.compare_at_paise is not None and body.compare_at_paise <= body.price_paise:
        raise bad_request("invalid_compare_price", "Compare-at price must be higher than the price")
    if body.slug and body.slug != p.slug:
        p.slug = _unique_slug(db, body.slug, Product, skip_id=p.id)
    _apply_product(p, body)
    db.commit()
    return _admin_product(p)


@router.post("/products/{product_id}/archive", response_model=ProductAdminOut)
def archive_product(product_id: int, db: DB) -> ProductAdminOut:
    p = db.get(Product, product_id)
    if not p:
        raise not_found("Product not found")
    p.is_active = False
    db.commit()
    return _admin_product(p)


@router.post("/products/{product_id}/restore", response_model=ProductAdminOut)
def restore_product(product_id: int, db: DB) -> ProductAdminOut:
    p = db.get(Product, product_id)
    if not p:
        raise not_found("Product not found")
    p.is_active = True
    db.commit()
    return _admin_product(p)


# ---------------- collections ----------------
@router.get("/collections", response_model=list[CollectionOut])
def admin_collections(db: DB) -> list[Collection]:
    return catalog.list_collections(db, include_inactive=True)


@router.post("/collections", response_model=CollectionOut, status_code=201)
def create_collection(body: CollectionIn, db: DB) -> Collection:
    c = Collection(
        slug=_unique_slug(db, body.slug or slugify(body.name), Collection),
        **body.model_dump(exclude={"slug"}),
    )
    db.add(c)
    db.commit()
    return c


@router.put("/collections/{collection_id}", response_model=CollectionOut)
def update_collection(collection_id: int, body: CollectionIn, db: DB) -> Collection:
    c = db.get(Collection, collection_id)
    if not c:
        raise not_found("Collection not found")
    for k, v in body.model_dump(exclude={"slug"}).items():
        setattr(c, k, v)
    if body.slug and body.slug != c.slug:
        c.slug = _unique_slug(db, body.slug, Collection, skip_id=c.id)
    db.commit()
    return c


@router.post("/collections/{collection_id}/archive", response_model=CollectionOut)
def archive_collection(collection_id: int, db: DB) -> Collection:
    c = db.get(Collection, collection_id)
    if not c:
        raise not_found("Collection not found")
    c.is_active = False
    db.commit()
    return c


@router.post("/collections/{collection_id}/restore", response_model=CollectionOut)
def restore_collection(collection_id: int, db: DB) -> Collection:
    c = db.get(Collection, collection_id)
    if not c:
        raise not_found("Collection not found")
    c.is_active = True
    db.commit()
    return c


# ---------------- orders ----------------
def _admin_order(order: Order) -> OrderAdminOut:
    base = order_out(order)
    return OrderAdminOut(
        **base.model_dump(),
        id=order.id,
        fulfilment_notes=order.fulfilment_notes,
        payments=[PaymentOut.model_validate(p) for p in order.payments],
        events=order.events,
        allowed_transitions=orders.allowed_transitions(order),
    )


@router.get("/orders", response_model=OrderListPage)
def admin_orders(
    db: DB,
    status: str | None = Query(None, max_length=24),
    q: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> OrderListPage:
    orders.release_expired(db)
    stmt = select(Order)
    if status:
        stmt = stmt.where(Order.status == status)
    else:
        stmt = stmt.where(Order.status != OrderStatus.PENDING_PAYMENT)
    if q and q.strip():
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Order.reference.ilike(like), Order.email.ilike(like), Order.customer_name.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(stmt.order_by(Order.id.desc()).limit(page_size).offset((page - 1) * page_size)).all()
    return OrderListPage(items=[_list_item(o) for o in rows], total=total, page=page, page_size=page_size)


@router.get("/orders/{order_id}", response_model=OrderAdminOut)
def admin_order(order_id: int, db: DB) -> OrderAdminOut:
    o = db.get(Order, order_id)
    if not o:
        raise not_found("Order not found")
    return _admin_order(o)


@router.post("/orders/{order_id}/transition", response_model=OrderAdminOut)
def transition(order_id: int, body: TransitionIn, db: DB, admin: CurrentAdmin) -> OrderAdminOut:
    o = orders.transition_order(
        db, order_id, body.to_status,
        tracking_reference=body.tracking_reference, note=body.note, actor=admin.email,
    )  # fmt: skip
    return _admin_order(o)


@router.patch("/orders/{order_id}", response_model=OrderAdminOut)
def update_order_notes(order_id: int, body: OrderNotesIn, db: DB, admin: CurrentAdmin) -> OrderAdminOut:
    o = db.scalar(select(Order).where(Order.id == order_id).with_for_update())
    if not o:
        raise not_found("Order not found")
    if body.fulfilment_notes is not None and body.fulfilment_notes != o.fulfilment_notes:
        o.fulfilment_notes = body.fulfilment_notes
        orders.add_event(o, "note", note="Fulfilment notes updated", actor=admin.email)
    if body.tracking_reference is not None and body.tracking_reference != o.tracking_reference:
        o.tracking_reference = body.tracking_reference.strip()
        orders.add_event(o, "note", note=f"Tracking reference set: {o.tracking_reference}", actor=admin.email)
    db.commit()
    return _admin_order(o)


# ---------------- shipping ----------------
@router.get("/shipping-methods", response_model=list[ShippingMethodAdminOut])
def admin_shipping(db: DB) -> list[ShippingMethodAdminOut]:
    rows = db.scalars(select(ShippingMethod).order_by(ShippingMethod.sort_order, ShippingMethod.id))
    return [
        ShippingMethodAdminOut(
            id=m.id,
            code=m.code,
            label=m.label,
            description=m.description,
            price_paise=m.price_paise,
            requires_address=m.requires_address,
            free_above_paise=m.free_above_paise,
            is_active=m.is_active,
        )  # fmt: skip
        for m in rows
    ]


@router.put("/shipping-methods/{method_id}", response_model=ShippingMethodAdminOut)
def update_shipping(method_id: int, body: ShippingMethodIn, db: DB) -> ShippingMethodAdminOut:
    m = db.get(ShippingMethod, method_id)
    if not m:
        raise not_found("Shipping method not found")
    m.label, m.description, m.price_paise = body.label, body.description, body.price_paise
    m.free_above_paise, m.is_active = body.free_above_paise, body.is_active
    db.commit()
    return ShippingMethodAdminOut(
        id=m.id, code=m.code, label=m.label, description=m.description, price_paise=m.price_paise,
        requires_address=m.requires_address, free_above_paise=m.free_above_paise, is_active=m.is_active,
    )  # fmt: skip


# ---------------- uploads ----------------
_MAGIC = {
    b"\x89PNG\r\n\x1a\n": ".png",
    b"\xff\xd8\xff": ".jpg",
    b"GIF8": ".gif",
}


def _sniff(data: bytes) -> str | None:
    for magic, ext in _MAGIC.items():
        if data.startswith(magic):
            return ext
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return ".webp"
    return None


@router.post("/uploads")
async def upload_image(file: UploadFile = File(...)) -> dict[str, str]:
    s = get_settings()
    data = await file.read(s.max_upload_bytes + 1)
    if len(data) > s.max_upload_bytes:
        raise AppError(413, "file_too_large", f"Image must be under {s.max_upload_bytes // 1024 // 1024} MB")
    ext = _sniff(data)
    if not ext:
        raise bad_request("invalid_image", "Only PNG, JPEG, WebP or GIF images are accepted")
    directory = Path(s.upload_dir)
    directory.mkdir(parents=True, exist_ok=True)
    name = f"{uuid.uuid4().hex}{ext}"
    (directory / name).write_bytes(data)
    return {"url": f"/media/{name}"}
