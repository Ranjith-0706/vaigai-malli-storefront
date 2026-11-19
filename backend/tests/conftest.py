import os
import subprocess
import sys
from collections.abc import Iterator
from pathlib import Path
from typing import Any

# Must be set before `app` is imported anywhere.
TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://saree:saree_local_pw@localhost:5433/saree_test")
os.environ["DATABASE_URL"] = TEST_DB
os.environ["JWT_SECRET"] = "test-secret-test-secret-test-secret-123456"
os.environ["ENVIRONMENT"] = "test"
os.environ["UPLOAD_DIR"] = str(Path(__file__).parent / "_uploads")

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.orm import Session  # noqa: E402

from app.db import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import AdminUser, Product, ProductImage, ShippingMethod  # noqa: E402
from app.security import ALL_LIMITERS, hash_password  # noqa: E402

ADMIN_EMAIL = "owner@test.example"
ADMIN_PASSWORD = "correct-horse-battery"  # test-only, never used outside the test DB

ADDRESS = {"line1": "12 Temple Street", "city": "Madurai", "state": "Tamil Nadu", "pincode": "625001"}


@pytest.fixture(scope="session", autouse=True)
def _migrated_schema() -> Iterator[None]:
    """Build the schema through Alembic so migrations are exercised by the test run."""
    backend = Path(__file__).resolve().parents[1]
    env = {**os.environ, "DATABASE_URL": TEST_DB}
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=backend, env=env, check=True)
    yield


@pytest.fixture(autouse=True)
def _clean_db() -> Iterator[None]:
    with engine.begin() as conn:
        conn.execute(
            text(
                "TRUNCATE order_events, payments, order_items, orders, product_images, products, "
                "collections, shipping_methods, admin_users RESTART IDENTITY CASCADE"
            )
        )
    for lim in ALL_LIMITERS:
        lim.reset()
    yield


@pytest.fixture
def db() -> Iterator[Session]:
    with SessionLocal() as s:
        yield s


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


@pytest.fixture
def shipping(db: Session) -> None:
    db.add_all(
        [
            ShippingMethod(
                code="flat", label="Flat", price_paise=15000, free_above_paise=2500000,
                requires_address=True, sort_order=1,
            ),
            ShippingMethod(code="pickup", label="Pickup", price_paise=0, requires_address=False, sort_order=2),
        ]
    )  # fmt: skip
    db.commit()


def make_product(db: Session, **kw: Any) -> Product:
    n = db.query(Product).count() + 1
    data: dict[str, Any] = {
        "slug": f"saree-{n}", "name": f"Saree {n}", "category": "Soft Silk", "fabric": "Soft silk",
        "color": "Maroon", "color_hex": "#800000", "price_paise": 1000000, "stock": 5,
    }  # fmt: skip
    data.update(kw)
    p = Product(**data)
    p.images = [ProductImage(url=f"/products/{data['slug']}/drape.svg", alt=data["name"], position=0)]
    db.add(p)
    db.commit()
    return p


@pytest.fixture
def product(db: Session, shipping: None) -> Product:
    return make_product(db, name="Test Silk", slug="test-silk", price_paise=1000000, stock=5)


def checkout_payload(items: list[tuple[int, int]], *, method: str = "flat", email: str = "buyer@example.com") -> dict:
    payload: dict[str, Any] = {
        "items": [{"product_id": pid, "quantity": q} for pid, q in items],
        "contact": {"name": "Test Buyer", "email": email, "phone": "9876543210"},
        "shipping_method": method,
    }
    if method != "pickup":
        payload["address"] = ADDRESS
    return payload


def place_order(client: TestClient, items: list[tuple[int, int]], **kw: Any) -> dict:
    r = client.post("/api/v1/checkout/orders", json=checkout_payload(items, **kw))
    assert r.status_code == 201, r.text
    return r.json()


def pay(
    client: TestClient,
    ref: str,
    *,
    outcome: str = "success",
    key: str = "attempt-0001",
    email: str = "buyer@example.com",
):
    return client.post(f"/api/v1/orders/{ref}/pay", json={"email": email, "attempt_key": key, "demo_outcome": outcome})


@pytest.fixture
def admin(db: Session) -> AdminUser:
    a = AdminUser(email=ADMIN_EMAIL, password_hash=hash_password(ADMIN_PASSWORD))
    db.add(a)
    db.commit()
    return a


@pytest.fixture
def admin_client(client: TestClient, admin: AdminUser) -> TestClient:
    r = client.post("/api/v1/admin/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return client
