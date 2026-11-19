from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import ProductImage
from tests.conftest import make_product


def _seed(db: Session) -> None:
    make_product(
        db,
        slug="a",
        name="Alpha Kanchi",
        category="Kanchipuram Silk",
        color="Maroon",
        price_paise=3000000,
        stock=4,
        featured=True,
    )
    make_product(
        db, slug="b", name="Beta Cotton", category="Handloom Cotton", color="Indigo", price_paise=300000, stock=10
    )
    make_product(db, slug="c", name="Gamma Soft", category="Soft Silk", color="Maroon", price_paise=900000, stock=2)
    make_product(db, slug="d", name="Delta Sold", category="Soft Silk", color="Green", price_paise=800000, stock=0)
    make_product(
        db,
        slug="e",
        name="Echo Archived",
        category="Soft Silk",
        color="Green",
        price_paise=800000,
        stock=3,
        is_active=False,
    )


def names(r) -> list[str]:
    return [p["name"] for p in r.json()["items"]]


def test_lists_only_active_products(client: TestClient, db: Session) -> None:
    _seed(db)
    r = client.get("/api/v1/products")
    assert r.status_code == 200
    assert "Echo Archived" not in names(r)
    assert r.json()["total"] == 4


def test_filter_category_and_color(client: TestClient, db: Session) -> None:
    _seed(db)
    assert names(client.get("/api/v1/products", params={"category": "Soft Silk"})) == ["Gamma Soft", "Delta Sold"]
    assert set(names(client.get("/api/v1/products", params={"color": "maroon"}))) == {"Alpha Kanchi", "Gamma Soft"}
    both = client.get("/api/v1/products", params={"category": ["Soft Silk", "Handloom Cotton"], "color": "Indigo"})
    assert names(both) == ["Beta Cotton"]


def test_filter_price_range_in_paise(client: TestClient, db: Session) -> None:
    _seed(db)
    r = client.get("/api/v1/products", params={"min_price": 800000, "max_price": 1000000})
    assert set(names(r)) == {"Gamma Soft", "Delta Sold"}


def test_search_matches_name_and_escapes_wildcards(client: TestClient, db: Session) -> None:
    _seed(db)
    assert names(client.get("/api/v1/products", params={"q": "kanchi"})) == ["Alpha Kanchi"]
    assert names(client.get("/api/v1/products", params={"q": "%"})) == []  # literal %, not a wildcard
    assert client.get("/api/v1/products", params={"q": "zzz"}).json()["total"] == 0


def test_sorting_puts_sold_out_last(client: TestClient, db: Session) -> None:
    _seed(db)
    assert names(client.get("/api/v1/products", params={"sort": "price_asc"})) == [
        "Beta Cotton", "Gamma Soft", "Alpha Kanchi", "Delta Sold",
    ]  # fmt: skip
    assert names(client.get("/api/v1/products", params={"sort": "price_desc"}))[0] == "Alpha Kanchi"
    assert names(client.get("/api/v1/products", params={"sort": "price_desc"}))[-1] == "Delta Sold"


def test_in_stock_filter_and_availability_flags(client: TestClient, db: Session) -> None:
    _seed(db)
    r = client.get("/api/v1/products", params={"in_stock": "true"})
    assert "Delta Sold" not in names(r)
    by = {p["slug"]: p for p in client.get("/api/v1/products").json()["items"]}
    assert by["d"]["in_stock"] is False and by["d"]["low_stock"] is False
    assert by["c"]["in_stock"] is True and by["c"]["low_stock"] is True  # stock 2 <= 3
    assert by["b"]["low_stock"] is False


def test_pagination_and_facets(client: TestClient, db: Session) -> None:
    _seed(db)
    r = client.get("/api/v1/products", params={"page_size": 3, "page": 2}).json()
    assert r["total"] == 4 and r["pages"] == 2 and len(r["items"]) == 1
    assert r["facets"]["price_min_paise"] == 300000 and r["facets"]["price_max_paise"] == 3000000
    assert "Indigo" in r["facets"]["colors"]
    assert client.get("/api/v1/products", params={"page_size": 500}).status_code == 422


def test_product_detail_related_and_archived_404(client: TestClient, db: Session) -> None:
    _seed(db)
    r = client.get("/api/v1/products/c")
    assert r.status_code == 200
    body = r.json()
    assert body["images"] and body["care"] is not None
    assert all(rel["slug"] != "c" for rel in body["related"]) and body["related"]
    assert client.get("/api/v1/products/e").status_code == 404
    assert client.get("/api/v1/products/nope").status_code == 404
    assert client.get("/api/v1/products/e").json()["error"]["code"] == "not_found"


def test_listing_exposes_second_image_only_when_it_exists(client: TestClient, db: Session) -> None:
    one = make_product(db, slug="one-image", name="One Image")
    two = make_product(db, slug="two-images", name="Two Images")
    two.images.append(ProductImage(url="/products/two-images/border.svg", alt="Border", position=1))
    db.commit()
    items = {i["slug"]: i for i in client.get("/api/v1/products").json()["items"]}
    assert items[one.slug]["hover_image_url"] is None
    assert items[two.slug]["image_url"].endswith("drape.svg")
    assert items[two.slug]["hover_image_url"] == "/products/two-images/border.svg"
