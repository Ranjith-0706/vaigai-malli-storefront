# Final report — Vaigai Malli demo storefront (2026-11-19)

## 1. What was built
A complete guest-checkout saree storefront and admin console, running locally on Next.js 16 + FastAPI + PostgreSQL 17, with a simulated payment provider.

* **Brand**: "Vaigai Malli" (Madurai's river + jasmine). Warm ivory / deep maroon / leaf green / restrained gold; Cormorant Garamond + Hanken Grotesk; temple-arch image frames, gopuram-step borders, a swaying jasmine thodarkodi garland in the hero, korvai-style craft story. All content is marked as demo.
* **Storefront**: home, shop with filters/sort/pagination/empty states, collections, product detail (3 images each, fabric, colour, stock, care, delivery, related), persistent cart, guest checkout (Indian address, shipping options), demo payment (success / failure / retry / cancel), confirmation + status tracker, lookup by reference + email, 6 sample-policy pages, sitemap/robots, metadata, JSON-LD.
* **Admin**: Argon2-hashed login, dashboard, orders (status transitions, tracking, notes, audit history), products (create/edit/archive, price/stock, images by URL or upload), collections, configurable shipping.
* **Commerce core**: integer paise, server-side repricing, row-locked stock reservation + DB `CHECK`, idempotent checkout and payment, explicit order/payment state model, 30-minute reservation expiry.
* **Engineering**: Alembic migration, seed/CLI, JSON logs, health endpoint, rate limiting, security headers, OpenAPI docs, CI workflow, 109 automated tests.

## 2. What works (all verified — see TEST_REPORT.md)
Backend 58/58, frontend unit 16/16, Playwright 35/35 (customer + admin journeys, desktop and mobile, plus axe accessibility scans), lint/types/build clean, migrations up/down/up + drift check clean, seed idempotent. Screenshots in `docs/screenshots/` (e.g. `desktop-01-home.png`, `mobile-05-product.png`, `desktop-10-admin-dashboard.png`, `mobile-07-checkout.png`).

## 3. Demo / live limitations
* **Payments are simulated.** No gateway is integrated; Razorpay is **not** implemented or tested (requirements are in ARCHITECTURE.md §6). The app refuses any `PAYMENT_PROVIDER` other than `demo`.
* Products, photos (illustrations), prices, stock, policies, contact info are fictional; no real weaver/certification claims.
* No courier integration; shipping is manual with a typed tracking reference. No automated delivery estimates.
* No e-mail/SMS: customers are not notified of confirmations or shipping (they use the track-order page).
* No GST invoicing; prices are labelled "inclusive of taxes (sample)".
* Refunds are a manual, out-of-system step (orders are flagged `refund_due`).
* Demo site is `noindex`.

## 4. Unresolved issues / caveats (honest list)
1. **CI workflow unexecuted on GitHub.** Every command in it passed locally, but the YAML itself has not run.
2. **Rate limiter is in-process** — fine for one API instance; replace before scaling out.
3. **Reservation expiry is lazy** (runs on checkout, admin order list/dashboard, payment). A quiet shop could show reserved stock as unavailable until one of those runs. A scheduled job is the next step if that matters.
4. **No Dockerfile for the API/web** (Compose only provides PostgreSQL); deployment steps are documented but not exercised.
5. **Uploads are stored on local disk** (`UPLOAD_DIR`); production needs a persistent volume or object storage. No image resizing/optimisation (artwork is SVG).
6. **Admin**: one role; no password-reset or user-management UI (use the CLI); no per-IP lockout beyond the rate limiter; CSRF protection relies on `SameSite=Lax` + Origin check.
7. **Accessibility**: automated axe + keyboard checks only; no screen-reader or real-device testing.
8. Cart is per-browser (`localStorage`), so it doesn't follow a shopper across devices.
9. Pytest prints one deprecation warning from Starlette's TestClient (cosmetic).
10. Frontend dependencies are exact-pinned in `package.json`/`package-lock.json`; backend pins are exact in `requirements*.txt` (top-level only — no hash-locked lockfile).

## 5. Exact next steps to make this ready for a real client
1. Collect the business inputs in CLIENT_HANDOFF.md §3 (name/domain, photos, prices, stock, shipping, returns policy, GST, legal text, support contacts).
2. Replace seed data with real catalogue (admin UI or a one-off import script) and real photography; delete `scripts/generate_product_art.py` outputs.
3. Integrate Razorpay **test mode**: `RazorpayProvider`, order creation, signature + webhook verification, refunds; run the same concurrency/failure/retry tests against it; then live keys via environment variables.
4. Add transactional e-mail (order confirmation, shipped with tracking) and a GST-compliant invoice PDF.
5. Have a professional review Privacy, Terms, Returns and Shipping text; add cookie/consent only if trackers are added.
6. Dockerfiles + deploy to staging (managed Postgres, `COOKIE_SECURE=true`, strong `JWT_SECRET`); run the Playwright suite against staging; set up backups and monitoring.
7. Move uploads to object storage; add a scheduled reservation-expiry job; add shared rate limiting if running >1 instance.
8. Run the CI workflow on GitHub and fix any environment differences; add Dependabot.
9. Real-device and screen-reader testing; performance budget and image optimisation with real photos.
10. Flip `noindex`/`robots`, remove demo banner and labels, submit sitemap.
