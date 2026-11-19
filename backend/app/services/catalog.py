import math
import re
from typing import Any, Literal

from sqlalchemy import Select, func, or_, select
from sqlalchemy.orm import Session

from app.errors import not_found
from app.models import Collection, Product
from app.schemas import Facets, ProductDetail, ProductPage, ProductSummary

LOW_STOCK_THRESHOLD = 3
SortKey = Literal["featured", "newest", "price_asc", "price_desc", "name"]


def slugify(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s or "item"


def to_summary(p: Product) -> ProductSummary:
    first = p.images[0] if p.images else None
    return ProductSummary(
        id=p.id,
        slug=p.slug,
        name=p.name,
        category=p.category,
        fabric=p.fabric,
        color=p.color,
        color_hex=p.color_hex,
        price_paise=p.price_paise,
        compare_at_paise=p.compare_at_paise,
        stock=p.stock,
        in_stock=p.stock > 0,
        low_stock=0 < p.stock <= LOW_STOCK_THRESHOLD,
        featured=p.featured,
        image_url=first.url if first else "",
        image_alt=first.alt if first else p.name,
        hover_image_url=p.images[1].url if len(p.images) > 1 else None,
        collection_slug=p.collection.slug if p.collection else None,
    )


def to_detail(p: Product, related: list[Product] | None = None) -> ProductDetail:
    base = to_summary(p).model_dump()
    return ProductDetail(
        **base,
        description=p.description,
        care=p.care,
        images=[{"id": i.id, "url": i.url, "alt": i.alt, "position": i.position} for i in p.images],
        collection_name=p.collection.name if p.collection else None,
        related=[to_summary(r) for r in (related or [])],
    )


def _escape_like(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _filtered(
    *,
    q: str | None,
    categories: list[str],
    colors: list[str],
    collection_slug: str | None,
    min_price: int | None,
    max_price: int | None,
    in_stock: bool,
    featured: bool,
) -> Select[Any]:
    stmt = select(Product).where(Product.is_active.is_(True))
    if q and q.strip():
        like = f"%{_escape_like(q.strip())}%"
        stmt = stmt.where(
            or_(
                Product.name.ilike(like, escape="\\"),
                Product.description.ilike(like, escape="\\"),
                Product.fabric.ilike(like, escape="\\"),
                Product.color.ilike(like, escape="\\"),
                Product.category.ilike(like, escape="\\"),
            )
        )
    if categories:
        stmt = stmt.where(func.lower(Product.category).in_([c.lower() for c in categories]))
    if colors:
        stmt = stmt.where(func.lower(Product.color).in_([c.lower() for c in colors]))
    if collection_slug:
        stmt = stmt.join(Collection, Product.collection_id == Collection.id).where(Collection.slug == collection_slug)
    if min_price is not None:
        stmt = stmt.where(Product.price_paise >= min_price)
    if max_price is not None:
        stmt = stmt.where(Product.price_paise <= max_price)
    if in_stock:
        stmt = stmt.where(Product.stock > 0)
    if featured:
        stmt = stmt.where(Product.featured.is_(True))
    return stmt


def list_products(
    db: Session,
    *,
    q: str | None = None,
    categories: list[str] | None = None,
    colors: list[str] | None = None,
    collection_slug: str | None = None,
    min_price: int | None = None,
    max_price: int | None = None,
    in_stock: bool = False,
    featured: bool = False,
    sort: SortKey = "featured",
    page: int = 1,
    page_size: int = 12,
) -> ProductPage:
    stmt = _filtered(
        q=q,
        categories=categories or [],
        colors=colors or [],
        collection_slug=collection_slug,
        min_price=min_price,
        max_price=max_price,
        in_stock=in_stock,
        featured=featured,
    )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    # sold-out items sink to the bottom of every ordering
    sold_out_last = (Product.stock == 0).asc()
    order_by: dict[str, list[Any]] = {
        "featured": [sold_out_last, Product.featured.desc(), Product.created_at.desc(), Product.id],
        "newest": [Product.created_at.desc(), Product.id.desc()],
        "price_asc": [sold_out_last, Product.price_paise.asc(), Product.id],
        "price_desc": [sold_out_last, Product.price_paise.desc(), Product.id],
        "name": [Product.name.asc(), Product.id],
    }
    rows = db.scalars(stmt.order_by(*order_by[sort]).limit(page_size).offset((page - 1) * page_size)).all()

    base = select(Product).where(Product.is_active.is_(True)).subquery()
    cats = db.scalars(select(base.c.category).distinct().order_by(base.c.category)).all()
    cols = db.scalars(select(base.c.color).distinct().order_by(base.c.color)).all()
    lo, hi = db.execute(select(func.min(base.c.price_paise), func.max(base.c.price_paise))).one()
    return ProductPage(
        items=[to_summary(p) for p in rows],
        total=total,
        page=page,
        page_size=page_size,
        pages=max(1, math.ceil(total / page_size)),
        facets=Facets(categories=list(cats), colors=list(cols), price_min_paise=lo or 0, price_max_paise=hi or 0),
    )


def get_product_detail(db: Session, slug: str) -> ProductDetail:
    p = db.scalar(select(Product).where(Product.slug == slug, Product.is_active.is_(True)))
    if not p:
        raise not_found("Product not found")
    related_stmt = (
        select(Product)
        .where(Product.is_active.is_(True), Product.id != p.id)
        .order_by(
            (Product.category == p.category).desc(),
            (Product.collection_id == p.collection_id).desc(),
            (Product.stock == 0).asc(),
            Product.featured.desc(),
            Product.id,
        )
        .limit(4)
    )
    return to_detail(p, list(db.scalars(related_stmt)))


def list_collections(db: Session, include_inactive: bool = False) -> list[Collection]:
    stmt = select(Collection).order_by(Collection.sort_order, Collection.id)
    if not include_inactive:
        stmt = stmt.where(Collection.is_active.is_(True))
    return list(db.scalars(stmt))
