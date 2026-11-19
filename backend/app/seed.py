"""Demo catalogue. Every product here is FICTIONAL sample data (see docs/ASSETS)."""

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.models import Collection, Product, ProductImage, ShippingMethod

CARE = (
    "Dry clean for the first few washes. Store folded in a soft muslin cloth, away from damp. "
    "Refold along different lines every few months to protect zari. Avoid perfume or "
    "deodorant directly on the fabric."
)
CARE_COTTON = (
    "Gentle hand wash in cold water with mild soap; do not wring. Dry in shade. "
    "Iron on medium heat on the reverse. Colours may bleed in the first wash."
)

COLLECTIONS = [
    ("kanchipuram-silks", "Kanchipuram Silk",
     "Heavier silks with woven zari, made for weddings and temple festivals.", 1),
    ("temple-borders", "Temple Border Classics",
     "Gopuram, rudraksham and mayil motifs on contrasting korvai borders.", 2),
    ("soft-silk-everyday", "Soft Silk for Every Day",
     "Lighter silks that drape easily and travel well.", 3),
    ("handloom-cottons", "Handloom Cottons",
     "Breathable weekday weaves in natural and plant-inspired colours.", 4),
]  # fmt: skip

# slug, name, category, fabric, color, hex, price_inr, compare_inr, stock, collection, featured, blurb
PRODUCTS = [
    ("meenakshi-maroon-kanchipuram", "Meenakshi Maroon Kanchipuram", "Kanchipuram Silk",
     "Pure silk, woven zari", "Maroon", "#7a1424", 28500, None, 4, "kanchipuram-silks", True,
     "Deep maroon body with a wide gopuram-step border in antique gold zari and a rich pallu of temple lamps."),
    ("thodarkodi-jasmine-ivory", "Thodarkodi Jasmine Ivory", "Kanchipuram Silk",
     "Pure silk, woven zari", "Ivory", "#efe6d2", 32000, None, 2, "kanchipuram-silks", True,
     "Ivory body scattered with small jasmine buttas, finished with a leaf-green border that mimics a hanging flower garland."),
    ("kumkum-bridal-kanchipuram", "Kumkum Bridal Kanchipuram", "Kanchipuram Silk",
     "Pure silk, heavy zari", "Red", "#a3141e", 48000, 52000, 1, "kanchipuram-silks", True,
     "A one-piece bridal red with a dense zari pallu and contrast green blouse piece. Only one in the demo stock."),
    ("mayil-kanchi-peacock-blue", "Mayil Kanchi Peacock Blue", "Kanchipuram Silk",
     "Pure silk, woven zari", "Teal", "#0e5a6b", 26800, None, 3, "kanchipuram-silks", False,
     "Shot teal-and-green body with peacock motifs along the border and a plain, graceful pallu."),
    ("gopuram-border-peacock-green", "Gopuram Border Peacock Green", "Kanchipuram Silk",
     "Silk, korvai border", "Green", "#1f5e46", 24900, None, 5, "temple-borders", True,
     "Leaf-green body with a stepped temple-tower border in maroon and gold; the border is woven separately and joined (korvai)."),
    ("rudraksham-border-mustard", "Rudraksham Border Mustard", "Kanchipuram Silk",
     "Silk, zari border", "Mustard", "#c9922b", 21500, None, 6, "temple-borders", False,
     "Warm turmeric-mustard body with a rudraksham-bead border in deep maroon."),
    ("arakku-lakshmi-pottu", "Arakku Lakshmi Pottu", "Kanchipuram Silk",
     "Silk, zari butta", "Arakku", "#9b1b30", 19800, 22000, 7, "temple-borders", False,
     "Lac-red body with Lakshmi coin (kasu) motifs across the pallu, a classic festival pick."),
    ("malli-soft-silk-ivory", "Malli Soft Silk Ivory", "Soft Silk",
     "Soft silk", "Ivory", "#f1ead8", 9400, None, 12, "soft-silk-everyday", True,
     "Light ivory soft silk with a narrow maroon border and tiny jasmine-bud weave; easy to wear all day."),
    ("karuppu-kodi-soft-silk", "Karuppu Kodi Soft Silk", "Soft Silk",
     "Soft silk", "Black", "#1d1a1a", 8900, None, 10, "soft-silk-everyday", False,
     "Black soft silk with a slim gold vine border; a quiet evening saree."),
    ("mango-kolam-rani-pink", "Mango Kolam Rani Pink", "Soft Silk",
     "Soft silk", "Pink", "#b5245e", 10200, None, 8, "soft-silk-everyday", False,
     "Rani-pink soft silk with a mango (manga) motif border inspired by pongal kolams."),
    ("vaigai-indigo-handloom", "Vaigai Indigo Handloom", "Handloom Cotton",
     "Handloom cotton", "Indigo", "#2b3a67", 3600, None, 20, "handloom-cottons", True,
     "Indigo cotton with white checks and a narrow ivory border. Soft after the first wash."),
    ("pavalam-coral-cotton", "Pavalam Coral Cotton", "Handloom Cotton",
     "Handloom cotton", "Coral", "#c8553d", 3200, None, 15, "handloom-cottons", False,
     "Coral cotton with a contrast thread border, light enough for summer."),
    ("thulasi-green-silk-cotton", "Thulasi Green Silk Cotton", "Silk Cotton",
     "Silk-cotton blend", "Green", "#4a7c3b", 5800, None, 9, "handloom-cottons", False,
     "Basil-green silk-cotton with a gold-thread border and a slight sheen."),
    ("sandal-silk-cotton-contemporary", "Sandal Silk Cotton Contemporary", "Silk Cotton",
     "Silk-cotton blend", "Beige", "#c8ad82", 6400, None, 0, "handloom-cottons", False,
     "Sandal-beige silk-cotton with a minimal geometric border. Shown as sold out in the demo."),
    ("navy-zari-check-cotton", "Navy Zari Check Cotton", "Handloom Cotton",
     "Handloom cotton", "Navy", "#1b2748", 2900, None, 3, "handloom-cottons", False,
     "Navy cotton with fine zari checks; a work-day saree. Low stock in the demo."),
]  # fmt: skip

IMAGE_VIEWS = [("drape", "full drape"), ("border", "border and pallu detail"), ("weave", "weave texture close-up")]


def seed_catalogue(db: Session) -> None:
    cols: dict[str, Collection] = {}
    for slug, name, desc, order in COLLECTIONS:
        c = db.scalar(select(Collection).where(Collection.slug == slug)) or Collection(slug=slug)
        c.name, c.description, c.sort_order, c.is_active = name, desc, order, True
        c.image_url = f"/products/{[p for p in PRODUCTS if p[9] == slug][0][0]}/drape.svg"
        db.add(c)
        cols[slug] = c
    db.flush()
    for slug, name, cat, fabric, color, hexc, price, cmp_, stock, col, feat, blurb in PRODUCTS:
        p = db.scalar(select(Product).where(Product.slug == slug)) or Product(slug=slug)
        p.name, p.category, p.fabric, p.color, p.color_hex = name, cat, fabric, color, hexc
        p.price_paise = price * 100
        p.compare_at_paise = cmp_ * 100 if cmp_ else None
        p.stock, p.featured, p.is_active = stock, feat, True
        p.collection_id = cols[col].id
        p.description = (
            f"{blurb}\n\nDEMO PRODUCT: sample description and illustrative artwork for a portfolio "
            "storefront; this is not a real garment for sale."
        )
        p.care = CARE_COTTON if "Cotton" in cat else CARE
        p.images = [
            ProductImage(url=f"/products/{slug}/{view}.svg", alt=f"{name} saree, {label} (illustration)", position=n)
            for n, (view, label) in enumerate(IMAGE_VIEWS)
        ]
        db.add(p)
    seed_shipping(db)
    db.commit()


def seed_shipping(db: Session) -> None:
    defaults = [
        ("flat", "Flat-rate delivery (India)",
         "Demo rate. Dispatched manually by the shop; no courier integration.", 15000, 2500000, True, 1),
        ("pickup", "Local pickup (sample)",
         "Collect from the demo shop address once we confirm your order is ready.", 0, None, False, 2),
    ]  # fmt: skip
    for code, label, desc, price, free_above, needs_addr, order in defaults:
        m = db.scalar(select(ShippingMethod).where(ShippingMethod.code == code))
        if m:
            continue  # keep admin edits on re-seed
        db.add(ShippingMethod(code=code, label=label, description=desc, price_paise=price,
                              free_above_paise=free_above, requires_address=needs_addr,
                              is_active=True, sort_order=order))  # fmt: skip


def reset_all(db: Session) -> None:
    """Wipe commerce data (NOT admin users)."""
    db.execute(text(
        "TRUNCATE order_events, payments, order_items, orders, product_images, products, "
        "collections, shipping_methods RESTART IDENTITY CASCADE"
    ))  # fmt: skip
    db.commit()
