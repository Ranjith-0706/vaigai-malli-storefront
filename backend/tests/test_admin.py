import io
import re

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models import AdminUser, Product
from tests.conftest import ADMIN_EMAIL, ADMIN_PASSWORD, pay, place_order


# ---------- authentication / authorization ----------
def test_every_admin_route_requires_authentication(client: TestClient, admin: AdminUser) -> None:
    checked = 0
    for path, methods in app.openapi()["paths"].items():
        if not path.startswith("/api/v1/admin/") or path.startswith("/api/v1/admin/auth/"):
            continue
        url = re.sub(r"\{[a-z_]+\}", "1", path)
        for method in methods:
            r = client.request(method.upper(), url, json={} if method != "get" else None)
            assert r.status_code == 401, f"{method} {path} -> {r.status_code}"
            checked += 1
    assert checked >= 15


def test_login_logout_and_session(client: TestClient, admin: AdminUser) -> None:
    assert client.get("/api/v1/admin/auth/me").status_code == 401
    bad = client.post("/api/v1/admin/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong-password"})
    assert bad.status_code == 401 and bad.json()["error"]["code"] == "invalid_credentials"
    unknown = client.post(
        "/api/v1/admin/auth/login", json={"email": "nobody@test.example", "password": "whatever-1234"}
    )
    assert unknown.json() == bad.json()
    ok = client.post("/api/v1/admin/auth/login", json={"email": ADMIN_EMAIL.upper(), "password": ADMIN_PASSWORD})
    assert ok.status_code == 200
    set_cookie = ok.headers["set-cookie"].lower()
    assert "httponly" in set_cookie and "samesite=lax" in set_cookie
    assert client.get("/api/v1/admin/auth/me").json()["email"] == ADMIN_EMAIL
    client.post("/api/v1/admin/auth/logout")
    assert client.get("/api/v1/admin/auth/me").status_code == 401


def test_password_is_stored_hashed(db: Session, admin: AdminUser) -> None:
    assert admin.password_hash.startswith("$argon2") and ADMIN_PASSWORD not in admin.password_hash


def test_forged_and_deactivated_sessions_rejected(client: TestClient, db: Session, admin: AdminUser) -> None:
    client.cookies.set("vm_admin", "not-a-jwt")
    assert client.get("/api/v1/admin/dashboard").status_code == 401
    client.cookies.clear()
    client.post("/api/v1/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert client.get("/api/v1/admin/dashboard").status_code == 200
    admin.is_active = False
    db.commit()
    assert client.get("/api/v1/admin/dashboard").status_code == 401


def test_login_is_rate_limited(client: TestClient, admin: AdminUser) -> None:
    codes = [
        client.post("/api/v1/admin/auth/login", json={"email": ADMIN_EMAIL, "password": "bad-password"}).status_code
        for _ in range(12)
    ]
    assert codes[0] == 401 and codes[-1] == 429


def test_cross_origin_mutation_blocked(admin_client: TestClient) -> None:
    r = admin_client.post(
        "/api/v1/admin/collections", json={"name": "X Collection"}, headers={"Origin": "https://evil.example"}
    )
    assert r.status_code == 403
    ok = admin_client.post(
        "/api/v1/admin/collections", json={"name": "X Collection"}, headers={"Origin": "http://localhost:3000"}
    )
    assert ok.status_code == 201


# ---------- order status transitions ----------
def paid_order(client: TestClient, product: Product, qty: int = 1) -> dict:
    o = place_order(client, [(product.id, qty)])
    assert pay(client, o["reference"]).json()["success"]
    return client.post("/api/v1/orders/lookup", json={"reference": o["reference"], "email": "buyer@example.com"}).json()


def order_id(admin_client: TestClient, ref: str) -> int:
    rows = admin_client.get("/api/v1/admin/orders", params={"q": ref}).json()["items"]
    return rows[0]["id"]


def move(c: TestClient, oid: int, to: str, **kw):
    return c.post(f"/api/v1/admin/orders/{oid}/transition", json={"to_status": to, **kw})


def test_full_fulfilment_happy_path(admin_client: TestClient, product: Product) -> None:
    o = paid_order(admin_client, product)
    oid = order_id(admin_client, o["reference"])
    assert move(admin_client, oid, "confirmed").json()["status"] == "confirmed"
    assert move(admin_client, oid, "packed", note="Wrapped in muslin").json()["status"] == "packed"
    missing = move(admin_client, oid, "shipped")
    assert missing.status_code == 422 and missing.json()["error"]["code"] == "tracking_required"
    shipped = move(admin_client, oid, "shipped", tracking_reference="TRK123")
    assert shipped.json()["status"] == "shipped" and shipped.json()["tracking_reference"] == "TRK123"
    assert move(admin_client, oid, "delivered").json()["status"] == "delivered"
    detail = admin_client.get(f"/api/v1/admin/orders/{oid}").json()
    assert [e["to_status"] for e in detail["events"] if e["kind"] == "status"][-4:] == [
        "confirmed", "packed", "shipped", "delivered",
    ]  # fmt: skip
    assert detail["allowed_transitions"] == []
    # customer sees tracking via lookup
    seen = admin_client.post(
        "/api/v1/orders/lookup", json={"reference": o["reference"], "email": "buyer@example.com"}
    ).json()
    assert seen["status"] == "delivered" and seen["tracking_reference"] == "TRK123"


def test_invalid_and_duplicate_transitions_rejected(admin_client: TestClient, product: Product) -> None:
    o = paid_order(admin_client, product)
    oid = order_id(admin_client, o["reference"])
    skip = move(admin_client, oid, "shipped", tracking_reference="X")
    assert skip.status_code == 409 and skip.json()["error"]["code"] == "invalid_transition"
    assert move(admin_client, oid, "confirmed").status_code == 200
    assert move(admin_client, oid, "confirmed").status_code == 409  # repeated fulfilment step
    assert move(admin_client, oid, "new").status_code == 422  # not an admin-selectable status
    assert move(admin_client, 999999, "confirmed").status_code == 404


def test_cancel_restores_stock_and_flags_refund(admin_client: TestClient, db: Session, product: Product) -> None:
    o = paid_order(admin_client, product, qty=2)
    db.refresh(product)
    assert product.stock == 3
    oid = order_id(admin_client, o["reference"])
    r = move(admin_client, oid, "cancelled", note="Customer request")
    assert r.json()["status"] == "cancelled" and r.json()["payment_status"] == "refund_due"
    db.refresh(product)
    assert product.stock == 5
    assert move(admin_client, oid, "cancelled").status_code == 409  # no double restock
    db.refresh(product)
    assert product.stock == 5


def test_unpaid_orders_cannot_be_fulfilled(admin_client: TestClient, product: Product) -> None:
    o = place_order(admin_client, [(product.id, 1)])
    pay(admin_client, o["reference"], outcome="failure")
    oid = admin_client.get("/api/v1/admin/orders", params={"status": "pending_payment"}).json()["items"][0]["id"]
    assert move(admin_client, oid, "confirmed").status_code == 409


def test_pickup_order_ships_without_tracking(admin_client: TestClient, product: Product) -> None:
    o = place_order(admin_client, [(product.id, 1)], method="pickup")
    pay(admin_client, o["reference"])
    oid = order_id(admin_client, o["reference"])
    move(admin_client, oid, "confirmed")
    move(admin_client, oid, "packed")
    assert move(admin_client, oid, "shipped").status_code == 200


def test_fulfilment_notes_and_tracking_update(admin_client: TestClient, product: Product) -> None:
    o = paid_order(admin_client, product)
    oid = order_id(admin_client, o["reference"])
    r = admin_client.patch(
        f"/api/v1/admin/orders/{oid}", json={"fulfilment_notes": "Gift wrap", "tracking_reference": "ABC9"}
    )
    assert (
        r.status_code == 200
        and r.json()["fulfilment_notes"] == "Gift wrap"
        and r.json()["tracking_reference"] == "ABC9"
    )
    notes = [e["note"] for e in r.json()["events"] if e["kind"] == "note"]
    assert any("Gift wrap" in n or "notes" in n for n in notes)


def test_order_list_filters_and_dashboard(admin_client: TestClient, db: Session, product: Product) -> None:
    paid_order(admin_client, product)
    place_order(admin_client, [(product.id, 1)])  # unpaid: hidden by default
    lst = admin_client.get("/api/v1/admin/orders").json()
    assert lst["total"] == 1
    assert admin_client.get("/api/v1/admin/orders", params={"status": "pending_payment"}).json()["total"] == 1
    assert admin_client.get("/api/v1/admin/orders", params={"q": "buyer@example"}).json()["total"] == 1
    assert admin_client.get("/api/v1/admin/orders", params={"q": "nobody"}).json()["total"] == 0
    d = admin_client.get("/api/v1/admin/dashboard").json()
    assert d["orders_by_status"]["new"] == 1 and d["awaiting_action"] == 1
    assert d["revenue_paise"] == 1015000 and d["active_products"] == 1


# ---------- catalogue management ----------
PRODUCT_BODY = {
    "name": "New Saree", "category": "Soft Silk", "fabric": "Soft silk", "color": "Green", "color_hex": "#1f5e46",
    "price_paise": 950000, "stock": 6, "description": "d", "care": "c",
    "images": [{"url": "/products/x.svg", "alt": "x"}],
}  # fmt: skip


def test_product_create_update_archive_restore(admin_client: TestClient, db: Session, shipping: None) -> None:
    r = admin_client.post("/api/v1/admin/products", json=PRODUCT_BODY)
    assert r.status_code == 201
    p = r.json()
    assert p["slug"] == "new-saree" and p["is_active"] is True
    assert admin_client.post("/api/v1/admin/products", json=PRODUCT_BODY).json()["slug"] == "new-saree-2"
    assert admin_client.get("/api/v1/products/new-saree").status_code == 200

    upd = admin_client.put(
        f"/api/v1/admin/products/{p['id']}", json={**PRODUCT_BODY, "price_paise": 1100000, "stock": 2}
    )
    assert upd.json()["price_paise"] == 1100000 and upd.json()["stock"] == 2 and upd.json()["low_stock"] is True

    arch = admin_client.post(f"/api/v1/admin/products/{p['id']}/archive")
    assert arch.json()["is_active"] is False
    assert admin_client.get("/api/v1/products/new-saree").status_code == 404  # hidden from storefront
    assert admin_client.get(f"/api/v1/admin/products/{p['id']}").status_code == 200  # still editable
    assert admin_client.post(f"/api/v1/admin/products/{p['id']}/restore").json()["is_active"] is True


def test_product_validation(admin_client: TestClient) -> None:
    for bad in (
        {**PRODUCT_BODY, "price_paise": 0},
        {**PRODUCT_BODY, "price_paise": -5},
        {**PRODUCT_BODY, "stock": -1},
        {**PRODUCT_BODY, "color_hex": "red"},
        {**PRODUCT_BODY, "images": [{"url": "javascript:alert(1)", "alt": ""}]},
        {**PRODUCT_BODY, "compare_at_paise": 100},
        {**PRODUCT_BODY, "collection_id": 999},
    ):
        assert admin_client.post("/api/v1/admin/products", json=bad).status_code in (400, 422), bad


def test_collection_crud_and_archive(admin_client: TestClient) -> None:
    c = admin_client.post("/api/v1/admin/collections", json={"name": "Festival Edit", "description": "x"}).json()
    assert c["slug"] == "festival-edit"
    assert (
        admin_client.put(
            f"/api/v1/admin/collections/{c['id']}", json={"name": "Festival Edit 2", "is_active": True}
        ).json()["name"]
        == "Festival Edit 2"
    )
    assert any(x["slug"] == "festival-edit" for x in admin_client.get("/api/v1/collections").json())
    admin_client.post(f"/api/v1/admin/collections/{c['id']}/archive")
    assert all(x["slug"] != "festival-edit" for x in admin_client.get("/api/v1/collections").json())


def test_shipping_method_is_configurable(admin_client: TestClient, shipping: None) -> None:
    methods = admin_client.get("/api/v1/admin/shipping-methods").json()
    flat = next(m for m in methods if m["code"] == "flat")
    r = admin_client.put(
        f"/api/v1/admin/shipping-methods/{flat['id']}",
        json={"label": "Flat", "price_paise": 20000, "free_above_paise": None, "is_active": True},
    )
    assert r.status_code == 200
    opts = {o["code"]: o for o in admin_client.get("/api/v1/shipping-options").json()}
    assert opts["flat"]["price_paise"] == 20000


def test_image_upload_validates_content(admin_client: TestClient) -> None:
    png = b"\x89PNG\r\n\x1a\n" + b"0" * 32
    ok = admin_client.post("/api/v1/admin/uploads", files={"file": ("a.png", io.BytesIO(png), "image/png")})
    assert ok.status_code == 200 and ok.json()["url"].startswith("/media/") and ok.json()["url"].endswith(".png")
    svg = admin_client.post(
        "/api/v1/admin/uploads", files={"file": ("a.png", io.BytesIO(b"<svg onload=alert(1)>"), "image/png")}
    )
    assert svg.status_code == 400
    big = admin_client.post(
        "/api/v1/admin/uploads", files={"file": ("a.png", io.BytesIO(png + b"0" * (5 * 1024 * 1024)), "image/png")}
    )
    assert big.status_code == 413


def test_health_and_docs(client: TestClient) -> None:
    h = client.get("/health").json()
    assert h["status"] == "ok" and h["database"] == "up" and h["payment_mode"] == "demo"
    assert client.get("/openapi.json").status_code == 200
    assert client.get("/docs").status_code == 200
    r = client.get("/api/v1/products")
    assert r.headers["x-content-type-options"] == "nosniff"
