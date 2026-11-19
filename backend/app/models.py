"""Database models. All money is stored as integer paise."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base


class OrderStatus(StrEnum):
    PENDING_PAYMENT = "pending_payment"  # stock reserved, awaiting successful payment
    NEW = "new"
    CONFIRMED = "confirmed"
    PACKED = "packed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class PaymentStatus(StrEnum):
    UNPAID = "unpaid"
    FAILED = "failed"  # last attempt failed; retry allowed
    PAID = "paid"
    REFUND_DUE = "refund_due"  # paid order cancelled; refund is a manual step


class AttemptStatus(StrEnum):
    SUCCEEDED = "succeeded"
    FAILED = "failed"


class Collection(Base):
    __tablename__ = "collections"
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    image_url: Mapped[str] = mapped_column(String(500), default="")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    products: Mapped[list["Product"]] = relationship(back_populates="collection")


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("stock >= 0", name="ck_products_stock_nonneg"),
        CheckConstraint("price_paise > 0", name="ck_products_price_pos"),
        Index("ix_products_active_category", "is_active", "category"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(160), unique=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    category: Mapped[str] = mapped_column(String(80))
    fabric: Mapped[str] = mapped_column(String(120))
    color: Mapped[str] = mapped_column(String(60))
    color_hex: Mapped[str] = mapped_column(String(9), default="#800000")
    price_paise: Mapped[int] = mapped_column(BigInteger)
    compare_at_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    stock: Mapped[int] = mapped_column(Integer, default=0)
    care: Mapped[str] = mapped_column(Text, default="")
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # False = archived
    collection_id: Mapped[int | None] = mapped_column(ForeignKey("collections.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    collection: Mapped[Collection | None] = relationship(back_populates="products")
    images: Mapped[list["ProductImage"]] = relationship(
        back_populates="product",
        order_by="ProductImage.position",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class ProductImage(Base):
    __tablename__ = "product_images"
    id: Mapped[int] = mapped_column(primary_key=True)
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(500))
    alt: Mapped[str] = mapped_column(String(300), default="")
    position: Mapped[int] = mapped_column(Integer, default=0)
    product: Mapped[Product] = relationship(back_populates="images")


class ShippingMethod(Base):
    __tablename__ = "shipping_methods"
    __table_args__ = (CheckConstraint("price_paise >= 0", name="ck_ship_price_nonneg"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True)
    label: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300), default="")
    price_paise: Mapped[int] = mapped_column(BigInteger, default=0)
    free_above_paise: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    requires_address: Mapped[bool] = mapped_column(Boolean, default=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("ix_orders_status_created", "status", "created_at"),
        Index("ix_orders_email", "email"),
    )
    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(24), unique=True)
    idempotency_key: Mapped[str | None] = mapped_column(String(80), unique=True, nullable=True)
    status: Mapped[str] = mapped_column(String(24), default=OrderStatus.PENDING_PAYMENT)
    payment_status: Mapped[str] = mapped_column(String(24), default=PaymentStatus.UNPAID)
    stock_reserved: Mapped[bool] = mapped_column(Boolean, default=True)
    reservation_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # customer
    customer_name: Mapped[str] = mapped_column(String(160))
    email: Mapped[str] = mapped_column(String(254))
    phone: Mapped[str] = mapped_column(String(20))
    # shipping address
    address_line1: Mapped[str] = mapped_column(String(200), default="")
    address_line2: Mapped[str] = mapped_column(String(200), default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    state: Mapped[str] = mapped_column(String(60), default="")
    pincode: Mapped[str] = mapped_column(String(6), default="")
    # money (paise)
    subtotal_paise: Mapped[int] = mapped_column(BigInteger)
    shipping_paise: Mapped[int] = mapped_column(BigInteger)
    total_paise: Mapped[int] = mapped_column(BigInteger)
    shipping_method_code: Mapped[str] = mapped_column(String(40))
    shipping_method_label: Mapped[str] = mapped_column(String(120))
    # fulfilment
    tracking_reference: Mapped[str] = mapped_column(String(120), default="")
    fulfilment_notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order", cascade="all, delete-orphan", lazy="selectin"
    )
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", order_by="Payment.id", lazy="selectin")
    events: Mapped[list["OrderEvent"]] = relationship(back_populates="order", order_by="OrderEvent.id", lazy="selectin")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_item_qty_pos"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[int] = mapped_column(ForeignKey("products.id"))
    product_name: Mapped[str] = mapped_column(String(200))  # snapshot
    unit_price_paise: Mapped[int] = mapped_column(BigInteger)  # snapshot
    quantity: Mapped[int] = mapped_column(Integer)
    order: Mapped[Order] = relationship(back_populates="items")


class Payment(Base):
    """One row per payment attempt. Idempotent per (order, attempt_key)."""

    __tablename__ = "payments"
    __table_args__ = (UniqueConstraint("order_id", "attempt_key", name="uq_payment_attempt"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    provider: Mapped[str] = mapped_column(String(24))
    provider_ref: Mapped[str] = mapped_column(String(80), default="")
    attempt_key: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(16))
    amount_paise: Mapped[int] = mapped_column(BigInteger)
    failure_reason: Mapped[str] = mapped_column(String(200), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    order: Mapped[Order] = relationship(back_populates="payments")


class OrderEvent(Base):
    """Audit trail of status / payment changes."""

    __tablename__ = "order_events"
    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(24))  # status | payment | note
    from_status: Mapped[str] = mapped_column(String(24), default="")
    to_status: Mapped[str] = mapped_column(String(24), default="")
    note: Mapped[str] = mapped_column(Text, default="")
    actor: Mapped[str] = mapped_column(String(254), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    order: Mapped[Order] = relationship(back_populates="events")


class AdminUser(Base):
    __tablename__ = "admin_users"
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    password_hash: Mapped[str] = mapped_column(String(300))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
