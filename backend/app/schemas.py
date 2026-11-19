import re
from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

INDIAN_STATES = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa",
    "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala",
    "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland",
    "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
    "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands",
    "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", "Delhi",
    "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
]  # fmt: skip

MAX_LINE_QTY = 10


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------- catalogue ----------
class ImageOut(ORM):
    id: int
    url: str
    alt: str
    position: int


class CollectionOut(ORM):
    id: int
    slug: str
    name: str
    description: str
    image_url: str
    sort_order: int
    is_active: bool


class CollectionWithCount(CollectionOut):
    product_count: int = 0


class ProductSummary(ORM):
    id: int
    slug: str
    name: str
    category: str
    fabric: str
    color: str
    color_hex: str
    price_paise: int
    compare_at_paise: int | None
    stock: int
    in_stock: bool
    low_stock: bool
    featured: bool
    image_url: str
    image_alt: str
    collection_slug: str | None = None


class ProductDetail(ProductSummary):
    description: str
    care: str
    images: list[ImageOut]
    collection_name: str | None = None
    related: list[ProductSummary] = []


class Facets(BaseModel):
    categories: list[str]
    colors: list[str]
    price_min_paise: int
    price_max_paise: int


class ProductPage(BaseModel):
    items: list[ProductSummary]
    total: int
    page: int
    page_size: int
    pages: int
    facets: Facets


# ---------- cart / checkout ----------
class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=MAX_LINE_QTY)


class ShippingOptionOut(BaseModel):
    code: str
    label: str
    description: str
    price_paise: int
    requires_address: bool
    free_above_paise: int | None = None


class CartQuoteIn(BaseModel):
    items: list[CartItemIn] = Field(max_length=50)
    shipping_method: str | None = None


class CartLineOut(BaseModel):
    product_id: int
    slug: str | None = None
    name: str
    image_url: str = ""
    unit_price_paise: int = 0
    requested_quantity: int
    quantity: int  # server-approved quantity (may be reduced)
    max_quantity: int
    line_total_paise: int = 0
    status: Literal["ok", "reduced", "out_of_stock", "unavailable"]


class CartQuoteOut(BaseModel):
    lines: list[CartLineOut]
    subtotal_paise: int
    shipping_paise: int
    total_paise: int
    shipping_method: str
    shipping_options: list[ShippingOptionOut]
    has_issues: bool
    free_shipping_remaining_paise: int | None = None


_PHONE = re.compile(r"^(?:\+?91[\s-]?)?([6-9]\d{9})$")


class ContactIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=160)]
    email: EmailStr
    phone: str

    @field_validator("name")
    @classmethod
    def _strip(cls, v: str) -> str:
        return v.strip()

    @field_validator("phone")
    @classmethod
    def _phone(cls, v: str) -> str:
        m = _PHONE.match(re.sub(r"[\s-]", "", v))
        if not m:
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return m.group(1)


class AddressIn(BaseModel):
    line1: Annotated[str, Field(min_length=3, max_length=200)]
    line2: Annotated[str, Field(max_length=200)] = ""
    city: Annotated[str, Field(min_length=2, max_length=100)]
    state: str
    pincode: str

    @field_validator("state")
    @classmethod
    def _state(cls, v: str) -> str:
        if v not in INDIAN_STATES:
            raise ValueError("Select a valid Indian state or union territory")
        return v

    @field_validator("pincode")
    @classmethod
    def _pin(cls, v: str) -> str:
        if not re.fullmatch(r"[1-9]\d{5}", v.strip()):
            raise ValueError("Enter a valid 6-digit PIN code")
        return v.strip()


class CheckoutIn(BaseModel):
    items: list[CartItemIn] = Field(min_length=1, max_length=50)
    contact: ContactIn
    address: AddressIn | None = None
    shipping_method: str


class OrderItemOut(ORM):
    product_id: int
    product_name: str
    unit_price_paise: int
    quantity: int


class PaymentOut(ORM):
    id: int
    provider: str
    status: str
    amount_paise: int
    failure_reason: str
    created_at: datetime


class EventOut(ORM):
    id: int
    kind: str
    from_status: str
    to_status: str
    note: str
    created_at: datetime


class OrderOut(ORM):
    reference: str
    status: str
    payment_status: str
    customer_name: str
    email: str
    phone: str
    address_line1: str
    address_line2: str
    city: str
    state: str
    pincode: str
    subtotal_paise: int
    shipping_paise: int
    total_paise: int
    shipping_method_label: str
    shipping_method_code: str
    tracking_reference: str
    reservation_expires_at: datetime | None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemOut]
    payment_mode: str = "demo"


class OrderTimelineEntry(BaseModel):
    status: str
    at: datetime


class OrderLookupOut(OrderOut):
    timeline: list[OrderTimelineEntry] = []


class OrderLookupIn(BaseModel):
    reference: str = Field(min_length=3, max_length=24)
    email: EmailStr


class PayIn(BaseModel):
    email: EmailStr
    attempt_key: Annotated[str, Field(min_length=8, max_length=80)]
    demo_outcome: Literal["success", "failure"] = "success"


class PayOut(BaseModel):
    success: bool
    message: str
    order: OrderOut


class CancelIn(BaseModel):
    email: EmailStr


# ---------- admin ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AdminMe(BaseModel):
    id: int
    email: str


class ImageIn(BaseModel):
    url: Annotated[str, Field(min_length=1, max_length=500)]
    alt: Annotated[str, Field(max_length=300)] = ""

    @field_validator("url")
    @classmethod
    def _url(cls, v: str) -> str:
        v = v.strip()
        if not (v.startswith("/") or v.startswith("https://") or v.startswith("http://")):
            raise ValueError("Image URL must start with /, http:// or https://")
        if v.lower().startswith("javascript:"):
            raise ValueError("Invalid image URL")
        return v


class ProductIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=200)]
    slug: Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=160)] | None = None
    description: str = ""
    category: Annotated[str, Field(min_length=2, max_length=80)]
    fabric: Annotated[str, Field(min_length=2, max_length=120)]
    color: Annotated[str, Field(min_length=2, max_length=60)]
    color_hex: Annotated[str, Field(pattern=r"^#[0-9a-fA-F]{6}$")] = "#800000"
    price_paise: int = Field(gt=0, le=100_000_000)
    compare_at_paise: int | None = Field(default=None, gt=0, le=100_000_000)
    stock: int = Field(ge=0, le=100_000)
    care: str = ""
    featured: bool = False
    collection_id: int | None = None
    images: list[ImageIn] = Field(default_factory=list, max_length=12)


class ProductAdminOut(ProductDetail):
    is_active: bool
    collection_id: int | None
    created_at: datetime


class CollectionIn(BaseModel):
    name: Annotated[str, Field(min_length=2, max_length=160)]
    slug: Annotated[str, Field(pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$", max_length=120)] | None = None
    description: str = ""
    image_url: str = ""
    sort_order: int = 0
    is_active: bool = True


class TransitionIn(BaseModel):
    to_status: Literal["confirmed", "packed", "shipped", "delivered", "cancelled"]
    tracking_reference: Annotated[str, Field(max_length=120)] | None = None
    note: Annotated[str, Field(max_length=2000)] | None = None


class OrderNotesIn(BaseModel):
    fulfilment_notes: Annotated[str, Field(max_length=4000)] | None = None
    tracking_reference: Annotated[str, Field(max_length=120)] | None = None


class OrderAdminOut(OrderOut):
    id: int
    fulfilment_notes: str
    payments: list[PaymentOut]
    events: list[EventOut]
    allowed_transitions: list[str]


class OrderListItem(ORM):
    id: int
    reference: str
    status: str
    payment_status: str
    customer_name: str
    email: str
    total_paise: int
    created_at: datetime
    item_count: int = 0


class OrderListPage(BaseModel):
    items: list[OrderListItem]
    total: int
    page: int
    page_size: int


class ShippingMethodIn(BaseModel):
    label: Annotated[str, Field(min_length=2, max_length=120)]
    description: Annotated[str, Field(max_length=300)] = ""
    price_paise: int = Field(ge=0, le=10_000_000)
    free_above_paise: int | None = Field(default=None, ge=0)
    is_active: bool = True


class ShippingMethodAdminOut(ShippingOptionOut):
    id: int
    is_active: bool


class DashboardOut(BaseModel):
    orders_by_status: dict[str, int]
    awaiting_action: int
    revenue_paise: int  # paid, non-cancelled orders
    orders_last_7_days: int
    low_stock: list[ProductSummary]
    out_of_stock_count: int
    active_products: int
    recent_orders: list[OrderListItem]
