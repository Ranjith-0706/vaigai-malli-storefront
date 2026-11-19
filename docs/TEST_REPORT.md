# Test report

Date: **2026-11-19** · Machine: Windows 11, Python 3.12.10, Node 24.18, PostgreSQL 17 (Docker) · All results below are from commands actually run in this session against the final code.

## 1. Results

| # | Command | Result | Counts / detail |
|---|---|---|---|
| 1 | `ruff check .` (backend) | **Pass** | all checks passed |
| 2 | `ruff format --check .` (backend) | **Pass** | 27 files formatted |
| 3 | `mypy app` | **Pass** | 20 source files, no issues |
| 4 | `pytest --cov=app` (backend; real PostgreSQL `saree_test`, schema built through Alembic) | **Pass** | **58 passed**, 0 failed, 1 deprecation warning (Starlette TestClient/httpx); coverage **88 %** (services/pricing, routers/public, models 100 %; `cli.py`/`seed.py` 0 % under pytest — they were exercised by the migration/seed check below and by every e2e run) |
| 5 | Migration verification: `alembic upgrade head` on an empty DB → `alembic current` → `alembic check` → `downgrade base` → `upgrade head` → `app.cli seed` ×2 | **Pass** | at head `0001`; no model drift; seed idempotent: 15 products, 45 images, 4 collections, 2 shipping methods |
| 6 | `npm run lint` (ESLint 9, next core-web-vitals + TypeScript) | **Pass** | 0 errors, 0 warnings |
| 7 | `npm run typecheck` (`tsc --noEmit`, TS 6, strict) | **Pass** | – |
| 8 | `npm test` (Vitest + Testing Library) | **Pass** | **16 passed** (2 files) |
| 9 | `npm run build` (Next 16 production build) | **Pass** | 28 routes; also built successfully with the API **down** (sitemap falls back) and during every e2e run |
| 10 | `npx playwright test` — desktop (Chrome 1280×800) + mobile (Pixel 7) | **Pass** | **35 passed**, 0 failed, 0 flaky, 2.8 min — 13 journey tests + 22 axe scans (11 pages × 2 viewports) |
| 11 | Visual review of desktop 1440×900 and mobile 390×844 screenshots (28 images) | Done manually | issues found and fixed — see §3 |

**Not run / not verified:** the GitHub Actions workflow itself (never executed on GitHub; each of its commands was run locally); anything against a real payment gateway (none exists); real-device mobile browsers (only Chromium emulation); screen-reader testing (only automated axe); load/performance testing; a from-scratch clone on a clean machine.

## 2. What the tests cover

**Backend (58)** — `tests/`
* `test_catalog.py` (8): category/colour/price/search filters, wildcard-escaping search, sorting (sold-out last), in-stock filter, availability/low-stock flags, pagination + facets, archived items 404, related products.
* `test_checkout.py` (16): server totals, client prices ignored, shipping flat / free-at-threshold / pickup / empty cart, stock clamping and unavailable flags, duplicate lines merged, quantity validation, reservation of stock, over-stock rejection with no side effects, archived rejection, Indian phone/PIN/state validation, address-vs-pickup rules, unknown shipping method, idempotent checkout, order lookup (email must match, identical errors), lookup rate limit.
* `test_payments_concurrency.py` (15): payment success; failure never paid; retry after failure; same attempt key idempotent (success and failure replay); paid order not charged twice; wrong email; customer cancel restores stock; paid order not customer-cancellable; expired reservation blocks payment and releases stock; checkout sweeps expired holds; **10 concurrent buyers of 3 units → exactly 3 orders**; **opposite-order multi-item carts → no deadlock**; **6 concurrent identical idempotent checkouts → 1 order, stock reserved once**; **6 concurrent payments → 1 charge**; DB rejects negative stock.
* `test_admin.py` (19): every `/admin/*` path in the OpenAPI schema returns 401 unauthenticated; login/logout/cookie flags; Argon2 hash stored; forged and deactivated sessions; login rate limit; cross-origin mutation blocked; full fulfilment path with tracking; invalid/duplicate transitions; cancel restores stock once + `refund_due`; unpaid cannot be fulfilled; pickup ships without tracking; notes/tracking update; list filters + dashboard numbers; product create/update/archive/restore; product validation; collection CRUD; configurable shipping; upload validation (magic bytes, SVG refused, size); health/docs/security headers.

**Frontend unit/component (16)** — money formatting/parsing, cart helpers and corrupt-storage sanitising, catalogue query building, checkout validation, `ProductCard` states, `AddToCart` (stock cap, persistence, restore after reload, sold out).

**Playwright (35)**
* Customer (×2 viewports): *home → shop → category filter → product → add 2 → cart (₹18,800 server subtotal) → checkout (validation errors, then valid; ₹150 shipping; ₹18,950 total) → demo pay → confirmation with `VM-XXXXXXXX` → track in a fresh browser context with reference + email; wrong email shows a generic error*; failed payment then successful retry; local pickup (no address, free); empty-search state and sold-out product; skip link, 6 info pages, 404.
* Admin (desktop): `/admin` redirects to login, API 401 without session, bad credentials message; **create order via API → sign in → search order → confirm → packed → shipping blocked without tracking → ship with tracking → save notes → delivered → no further actions → customer lookup shows `delivered` + tracking**; edit product price/stock → storefront shows ₹3,450 and "Only 2 left" → archive → 404 → create product → storefront 200.
* Accessibility: axe (WCAG 2 A/AA, 2.1 AA) on `/`, `/shop`, empty shop, `/collections`, a collection, a product, `/cart`, `/order-status`, `/about`, `/shipping`, `/admin/login` — no serious/critical violations.

## 3. Failures found and fixed during the session
| Found by | Problem | Fix |
|---|---|---|
| pytest | Indian phone with spaces (`+91 98765 43210`) rejected | validator strips spaces/dashes first |
| pytest | Route-enumeration auth test found 0 routes (FastAPI 0.165 nests routers) | enumerate the OpenAPI schema instead |
| tooling | Port 8000 was held by an unrelated local service (not this project) | API moved to **8010**; the other service was not touched |
| ESLint (React 19 rules) | `setState` in effects in cart/quote/admin hooks, header, order pages | derived state, `useSyncExternalStore` for stored email, keyed fetch state; one justified `eslint-disable` for hydrating from `localStorage` |
| Visual review | Cormorant's old-style numerals made "1" look like "I" in prices/stats | `font-variant-numeric: lining-nums` (verified in a new screenshot); logo sub-title spacing |
| Playwright | Mobile: filter panel collapsed after a filter submit | panel stays open while filters are active |
| axe | Gold step numerals (01–03) and 404 numeral failed contrast | darker `gold-ink` text colour |
| Playwright (test bugs) | e2e admin email on a `.test` domain is rejected by the API's e-mail validator; ambiguous locators; tests depended on one another's data | corrected test data and locators; specs made order-independent |
| lint | ESLint also scanned the generated `.next-e2e` build | ignored in config |

## 4. Remaining failures
None in the commands above. Known caveats are listed in FINAL_REPORT.md §4.

## 5. Evidence
* Screenshots: `docs/screenshots/` (28 PNGs: `desktop-*` at 1440×900 and `mobile-*` at 390×844, 2× scale; home, shop, filtered, empty state, product, cart, checkout, about, admin login/dashboard/orders/order detail/products).
* Playwright HTML report + JSON: `frontend/playwright-report/`, `frontend/test-results/results.json` (git-ignored; regenerate with `npm run test:e2e`). Failure traces/screenshots are retained under `frontend/test-results/artifacts/` only when a test fails (none in the final run).
