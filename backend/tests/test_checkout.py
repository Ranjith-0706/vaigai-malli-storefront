from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Product
from tests.conftest import ADDRESS, checkout_payload, make_product, place_order


def quote(client: TestClient, items, method: str | None = None) -> dict:
    body = {"items": [{"product_id": p, "quantity": q} for p, q in items]}
    if method:
        body["shipping_method"] = method
    r = client.post("/api/v1/cart/quote", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def test_quote_totals_use_server_prices(client: TestClient, product: Product) -> None:
    q = quote(client, [(product.id, 2)], "flat")
    assert q["subtotal_paise"] == 2000000
    assert q["shipping_paise"] == 15000
    assert q["total_paise"] == 2015000
    assert q["lines"][0]["unit_price_paise"] == 1000000


def test_client_supplied_prices_are_ignored(client: TestClient, product: Product) -> None:
    body = {"items": [{"product_id": product.id, "quantity": 1, "unit_price_paise": 1, "price": 1}], "total_paise": 1}
    q = client.post("/api/v1/cart/quote", json=body).json()
    assert q["subtotal_paise"] == 1000000
    payload = checkout_payload([(product.id, 1)])
    payload["items"][0]["unit_price_paise"] = 1
    payload["total_paise"] = 1
    order = client.post("/api/v1/checkout/orders", json=payload).json()
    assert order["subtotal_paise"] == 1000000 and order["total_paise"] == 1015000


def test_shipping_free_above_threshold_and_pickup(client: TestClient, db: Session, product: Product) -> None:
    big = make_product(db, slug="big", price_paise=2500000, stock=3)
    assert quote(client, [(big.id, 1)], "flat")["shipping_paise"] == 0  # exactly at threshold
    assert quote(client, [(product.id, 1)], "flat")["shipping_paise"] == 15000
    assert quote(client, [(product.id, 1)], "pickup")["shipping_paise"] == 0
    opts = {o["code"]: o for o in quote(client, [(product.id, 1)])["shipping_options"]}
    assert opts["flat"]["price_paise"] == 15000 and opts["pickup"]["requires_address"] is False


def test_empty_cart_quote_has_no_shipping(client: TestClient, shipping: None) -> None:
    q = quote(client, [])
    assert q["total_paise"] == 0 and q["shipping_paise"] == 0


def test_quote_reduces_to_stock_and_flags_issues(client: TestClient, db: Session, product: Product) -> None:
    sold = make_product(db, slug="sold", stock=0)
    gone = make_product(db, slug="gone", stock=4, is_active=False)
    q = quote(client, [(product.id, 9), (sold.id, 1), (gone.id, 1), (99999, 1)])
    status = {line["product_id"]: line for line in q["lines"]}
    assert status[product.id]["status"] == "reduced" and status[product.id]["quantity"] == 5
    assert status[sold.id]["status"] == "out_of_stock"
    assert status[gone.id]["status"] == "unavailable" and status[99999]["status"] == "unavailable"
    assert q["has_issues"] is True
    assert q["subtotal_paise"] == 5 * 1000000


def test_duplicate_lines_are_merged(client: TestClient, product: Product) -> None:
    q = quote(client, [(product.id, 2), (product.id, 1)])
    assert len(q["lines"]) == 1 and q["lines"][0]["quantity"] == 3


def test_quantity_validation(client: TestClient, product: Product) -> None:
    r = client.post("/api/v1/cart/quote", json={"items": [{"product_id": product.id, "quantity": 0}]})
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"
    r = client.post("/api/v1/cart/quote", json={"items": [{"product_id": product.id, "quantity": -3}]})
    assert r.status_code == 422


def test_checkout_creates_order_and_reserves_stock(client: TestClient, db: Session, product: Product) -> None:
    order = place_order(client, [(product.id, 2)])
    assert order["status"] == "pending_payment" and order["payment_status"] == "unpaid"
    assert order["reference"].startswith("VM-") and order["total_paise"] == 2015000
    db.refresh(product)
    assert product.stock == 3


def test_checkout_rejects_over_stock_without_side_effects(client: TestClient, db: Session, product: Product) -> None:
    r = client.post("/api/v1/checkout/orders", json=checkout_payload([(product.id, 6)]))
    assert r.status_code == 409
    err = r.json()["error"]
    assert err["code"] == "stock_unavailable" and err["details"][0]["available"] == 5
    db.refresh(product)
    assert product.stock == 5


def test_checkout_rejects_archived_product(client: TestClient, db: Session, product: Product) -> None:
    product.is_active = False
    db.commit()
    assert client.post("/api/v1/checkout/orders", json=checkout_payload([(product.id, 1)])).status_code == 409


def test_indian_address_and_phone_validation(client: TestClient, product: Product) -> None:
    bad_pin = checkout_payload([(product.id, 1)])
    bad_pin["address"] = {**ADDRESS, "pincode": "012345"}
    r = client.post("/api/v1/checkout/orders", json=bad_pin)
    assert r.status_code == 422
    assert any(f["field"].endswith("pincode") for f in r.json()["error"]["details"])

    bad_state = checkout_payload([(product.id, 1)])
    bad_state["address"] = {**ADDRESS, "state": "Atlantis"}
    assert client.post("/api/v1/checkout/orders", json=bad_state).status_code == 422

    bad_phone = checkout_payload([(product.id, 1)])
    bad_phone["contact"]["phone"] = "12345"
    assert client.post("/api/v1/checkout/orders", json=bad_phone).status_code == 422

    plus91 = checkout_payload([(product.id, 1)])
    plus91["contact"]["phone"] = "+91 98765 43210"
    assert client.post("/api/v1/checkout/orders", json=plus91).status_code == 201


def test_delivery_requires_address_but_pickup_does_not(client: TestClient, product: Product) -> None:
    no_addr = checkout_payload([(product.id, 1)], method="pickup")
    r = client.post("/api/v1/checkout/orders", json={**no_addr, "shipping_method": "flat"})
    assert r.status_code == 400 and r.json()["error"]["code"] == "address_required"
    ok = client.post("/api/v1/checkout/orders", json=no_addr)
    assert ok.status_code == 201 and ok.json()["shipping_paise"] == 0


def test_unknown_shipping_method(client: TestClient, product: Product) -> None:
    r = client.post("/api/v1/checkout/orders", json=checkout_payload([(product.id, 1)], method="drone"))
    assert r.status_code == 400 and r.json()["error"]["code"] == "invalid_shipping_method"


def test_repeated_checkout_with_same_idempotency_key_creates_one_order(
    client: TestClient, db: Session, product: Product
) -> None:
    h = {"Idempotency-Key": "checkout-key-0001"}
    body = checkout_payload([(product.id, 2)])
    a = client.post("/api/v1/checkout/orders", json=body, headers=h)
    b = client.post("/api/v1/checkout/orders", json=body, headers=h)
    assert a.status_code == 201 and b.status_code == 201
    assert a.json()["reference"] == b.json()["reference"]
    db.refresh(product)
    assert product.stock == 3  # reserved once, not twice


def test_order_lookup_requires_matching_email(client: TestClient, product: Product) -> None:
    order = place_order(client, [(product.id, 1)])
    ok = client.post(
        "/api/v1/orders/lookup", json={"reference": order["reference"].lower(), "email": "BUYER@example.com"}
    )
    assert ok.status_code == 200 and ok.json()["reference"] == order["reference"]
    bad = client.post("/api/v1/orders/lookup", json={"reference": order["reference"], "email": "other@example.com"})
    missing = client.post("/api/v1/orders/lookup", json={"reference": "VM-NOPE0000", "email": "buyer@example.com"})
    assert bad.status_code == 404 and missing.status_code == 404
    assert bad.json() == missing.json()  # no enumeration of valid references


def test_lookup_is_rate_limited(client: TestClient, product: Product) -> None:
    codes = [
        client.post("/api/v1/orders/lookup", json={"reference": "VM-AAAAAAAA", "email": "x@example.com"}).status_code
        for _ in range(22)
    ]
    assert codes[0] == 404 and codes[-1] == 429
