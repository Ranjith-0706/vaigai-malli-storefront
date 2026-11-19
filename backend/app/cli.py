"""Operational commands:  python -m app.cli <migrate|seed|create-admin|reset>"""

import argparse
import getpass
import os
import subprocess
import sys

from sqlalchemy import select

from app.config import get_settings
from app.db import SessionLocal
from app.models import AdminUser, Product
from app.schemas import AddressIn, CartItemIn, CheckoutIn, ContactIn
from app.security import hash_password
from app.seed import reset_all, seed_catalogue
from app.services import orders, payments

MIN_PASSWORD = 10


def cmd_migrate() -> None:
    subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], check=True)


def cmd_create_admin(email: str | None, password: str | None) -> None:
    s = get_settings()
    email = (email or s.admin_email or input("Admin email: ")).strip().lower()
    password = password or s.admin_password or getpass.getpass("Admin password: ")
    if len(password) < MIN_PASSWORD:
        sys.exit(f"Password must be at least {MIN_PASSWORD} characters.")
    with SessionLocal() as db:
        admin = db.scalar(select(AdminUser).where(AdminUser.email == email))
        if admin:
            admin.password_hash = hash_password(password)
            admin.is_active = True
            print(f"Updated password for existing admin {email}")
        else:
            db.add(AdminUser(email=email, password_hash=hash_password(password)))
            print(f"Created admin {email}")
        db.commit()


def seed_demo_orders() -> None:
    """A handful of orders in different states so the admin dashboard is not empty."""
    plan = [("Anitha Raman", "delivered"), ("Lakshmi Narayanan", "shipped"),
            ("Priya Subramanian", "packed"), ("Divya Krishnan", "confirmed"),
            ("Meena Sundar", "new"), ("Kavitha Ramesh", "new")]  # fmt: skip
    with SessionLocal() as db:
        prods = list(db.scalars(select(Product).where(Product.stock > 6).order_by(Product.id)))
        for n, (name, target) in enumerate(plan):
            email = f"demo.customer{n + 1}@example.com"
            order = orders.create_order(
                db,
                CheckoutIn(
                    items=[CartItemIn(product_id=prods[n % len(prods)].id, quantity=1)],
                    contact=ContactIn(name=name, email=email, phone="9876543210"),
                    address=AddressIn(line1="12 Sample Street", city="Madurai",
                                      state="Tamil Nadu", pincode="625001"),
                    shipping_method="flat",
                ),
                None,
            )  # fmt: skip
            payments.pay_order(db, order.reference, email, f"seed-attempt-{n}", "success")
            chain = ["confirmed", "packed", "shipped", "delivered"]
            for step in chain[: chain.index(target) + 1] if target != "new" else []:
                orders.transition_order(db, order.id, step, tracking_reference="DEMO-TRACK-1001",
                                        note=None, actor="seed")  # fmt: skip
        print(f"Created {len(plan)} demo orders")


def main() -> None:
    ap = argparse.ArgumentParser(prog="python -m app.cli")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("migrate", help="alembic upgrade head")
    sp = sub.add_parser("seed", help="load demo catalogue (idempotent)")
    sp.add_argument("--reset", action="store_true", help="wipe orders/catalogue first")
    sp.add_argument("--demo-orders", action="store_true", help="also create sample orders")
    ap_admin = sub.add_parser("create-admin", help="create/update an admin (no default password)")
    ap_admin.add_argument("--email")
    ap_admin.add_argument("--password", help="avoid: prefer ADMIN_PASSWORD env or the prompt")
    args = ap.parse_args()

    if args.cmd == "migrate":
        cmd_migrate()
    elif args.cmd == "seed":
        with SessionLocal() as db:
            if args.reset:
                reset_all(db)
            seed_catalogue(db)
        print("Seeded catalogue")
        if args.demo_orders:
            seed_demo_orders()
    elif args.cmd == "create-admin":
        cmd_create_admin(args.email, args.password)


if __name__ == "__main__":
    os.environ.setdefault("PYTHONUTF8", "1")
    main()
