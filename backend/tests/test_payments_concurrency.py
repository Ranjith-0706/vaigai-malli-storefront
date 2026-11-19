from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Order, Payment, Product
from tests.conftest import checkout_payload, make_product, pay, place_order


def lookup(client: TestClient, ref: str) -> dict:
    return client.post("/api/v1/orders/lookup", json={"reference": ref, "email": "buyer@example.com"}).json()


# ---------- payment states ----------
def test_payment_success_marks_order_paid_and_new(client: TestClient, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    r = pay(client, ref)
    assert r.status_code == 200 and r.json()["success"] is True
    o = lookup(client, ref)
    assert o["status"] == "new" and o["payment_status"] == "paid"
    assert "No money" in r.json()["message"]


def test_failed_payment_never_becomes_a_paid_order(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 2)])["reference"]
    r = pay(client, ref, outcome="failure")
    assert r.status_code == 200 and r.json()["success"] is False
    o = lookup(client, ref)
    assert o["payment_status"] == "failed" and o["status"] == "pending_payment"
    db.refresh(product)
    assert product.stock == 3  # still reserved so the customer can retry


def test_retry_after_failure_succeeds(client: TestClient, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    assert pay(client, ref, outcome="failure", key="attempt-fail-1").json()["success"] is False
    ok = pay(client, ref, outcome="success", key="attempt-ok-002")
    assert ok.json()["success"] is True
    o = lookup(client, ref)
    assert o["status"] == "new" and o["payment_status"] == "paid"


def test_same_attempt_key_is_idempotent(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    a = pay(client, ref, key="same-key-0001")
    b = pay(client, ref, key="same-key-0001")
    assert a.json()["success"] and b.json()["success"]
    assert db.scalar(select(func.count()).select_from(Payment)) == 1
    # a replayed *failed* attempt stays failed rather than being re-rolled
    ref2 = place_order(client, [(product.id, 1)])["reference"]
    assert pay(client, ref2, outcome="failure", key="same-key-0002").json()["success"] is False
    assert pay(client, ref2, outcome="success", key="same-key-0002").json()["success"] is False


def test_paying_a_paid_order_does_not_charge_twice(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    assert pay(client, ref, key="first-attempt-1").json()["success"] is True
    again = pay(client, ref, key="second-attempt-2", outcome="failure")
    assert again.json()["success"] is True  # reports the existing paid state
    assert db.scalar(select(func.count()).select_from(Payment)) == 1
    assert lookup(client, ref)["payment_status"] == "paid"


def test_pay_requires_matching_email(client: TestClient, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    assert pay(client, ref, email="intruder@example.com").status_code == 404


def test_customer_cancel_after_failed_payment_restores_stock(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 2)])["reference"]
    pay(client, ref, outcome="failure")
    r = client.post(f"/api/v1/orders/{ref}/cancel", json={"email": "buyer@example.com"})
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    db.refresh(product)
    assert product.stock == 5
    assert pay(client, ref, key="after-cancel-01").status_code == 409


def test_paid_order_cannot_be_cancelled_by_customer(client: TestClient, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]
    pay(client, ref)
    r = client.post(f"/api/v1/orders/{ref}/cancel", json={"email": "buyer@example.com"})
    assert r.status_code == 409 and r.json()["error"]["code"] == "not_cancellable"


def test_expired_reservation_releases_stock_and_blocks_payment(
    client: TestClient, db: Session, product: Product
) -> None:
    ref = place_order(client, [(product.id, 3)])["reference"]
    order = db.scalar(select(Order).where(Order.reference == ref))
    order.reservation_expires_at = datetime.now(UTC) - timedelta(minutes=1)
    db.commit()
    r = pay(client, ref)
    assert r.status_code == 409 and r.json()["error"]["code"] == "reservation_expired"
    db.expire_all()
    db.refresh(product)
    assert product.stock == 5
    assert lookup(client, ref)["status"] == "cancelled"


def test_new_checkout_sweeps_expired_reservations(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 5)])["reference"]  # takes all stock
    assert client.post("/api/v1/checkout/orders", json=checkout_payload([(product.id, 1)])).status_code == 409
    order = db.scalar(select(Order).where(Order.reference == ref))
    order.reservation_expires_at = datetime.now(UTC) - timedelta(seconds=1)
    db.commit()
    assert client.post("/api/v1/checkout/orders", json=checkout_payload([(product.id, 1)])).status_code == 201


# ---------- concurrency ----------
def test_concurrent_checkouts_never_oversell(client: TestClient, db: Session, shipping: None) -> None:
    p = make_product(db, slug="last-three", stock=3)

    def attempt(i: int) -> int:
        with TestClient(client.app) as c:
            return c.post(
                "/api/v1/checkout/orders", json=checkout_payload([(p.id, 1)], email=f"b{i}@example.com")
            ).status_code

    with ThreadPoolExecutor(max_workers=10) as ex:
        codes = list(ex.map(attempt, range(10)))
    assert codes.count(201) == 3
    assert codes.count(409) == 7
    db.refresh(p)
    assert p.stock == 0
    assert db.scalar(select(func.count()).select_from(Order)) == 3


def test_concurrent_multi_item_checkouts_do_not_deadlock(client: TestClient, db: Session, shipping: None) -> None:
    a = make_product(db, slug="pa", stock=4)
    b = make_product(db, slug="pb", stock=4)

    def attempt(i: int) -> int:
        items = [(a.id, 1), (b.id, 1)] if i % 2 else [(b.id, 1), (a.id, 1)]  # opposite order
        with TestClient(client.app) as c:
            return c.post(
                "/api/v1/checkout/orders", json=checkout_payload(items, email=f"m{i}@example.com")
            ).status_code

    with ThreadPoolExecutor(max_workers=8) as ex:
        codes = list(ex.map(attempt, range(8)))
    assert codes.count(201) == 4 and codes.count(409) == 4
    db.refresh(a)
    db.refresh(b)
    assert (a.stock, b.stock) == (0, 0)


def test_concurrent_identical_idempotent_checkouts_create_one_order(
    client: TestClient, db: Session, product: Product
) -> None:
    body = checkout_payload([(product.id, 2)])

    def attempt(_: int) -> tuple[int, str]:
        with TestClient(client.app) as c:
            r = c.post("/api/v1/checkout/orders", json=body, headers={"Idempotency-Key": "double-click-01"})
            return r.status_code, r.json().get("reference", "")

    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(attempt, range(6)))
    assert {s for s, _ in results} == {201}
    assert len({ref for _, ref in results}) == 1
    assert db.scalar(select(func.count()).select_from(Order)) == 1
    db.refresh(product)
    assert product.stock == 3


def test_concurrent_payments_for_one_order_charge_once(client: TestClient, db: Session, product: Product) -> None:
    ref = place_order(client, [(product.id, 1)])["reference"]

    def attempt(i: int) -> bool:
        with TestClient(client.app) as c:
            return pay(c, ref, key=f"race-attempt-{i:03d}").json()["success"]

    with ThreadPoolExecutor(max_workers=6) as ex:
        results = list(ex.map(attempt, range(6)))
    assert all(results)
    assert db.scalar(select(func.count()).select_from(Payment)) == 1


def test_database_rejects_negative_stock(db: Session, shipping: None) -> None:
    import pytest
    from sqlalchemy.exc import IntegrityError

    p = make_product(db, slug="neg", stock=1)
    p.stock = -1
    with pytest.raises(IntegrityError):
        db.commit()
    db.rollback()
