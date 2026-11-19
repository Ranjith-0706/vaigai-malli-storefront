# Product requirements — Vaigai Malli demo storefront

## 1. Purpose
A demonstration saree storefront that (a) a saree-business client can click through, and (b) shows end-to-end engineering quality in a portfolio. Everything is demo data. See [CLIENT_HANDOFF.md](CLIENT_HANDOFF.md) for what a real launch still needs.

## 2. Users
| User | Goal |
|---|---|
| **Shopper (guest)** | Browse, filter, pick a saree, check out without an account, pay (simulated), later check order status |
| **Shop admin** | Maintain catalogue and stock, see and fulfil orders by hand, adjust shipping rates |
| **Client / reviewer** | Judge look, flow and whether it can become their shop |

No customer accounts exist (guest checkout only).

## 3. Pages and features
**Storefront** — `/` home (hero, collections, featured, craft story, CTA) · `/shop` listing (search, category, colour, price, in-stock, sort, pagination, empty state) · `/collections`, `/collections/[slug]` · `/products/[slug]` (gallery, fabric, colour, price, stock state, care, delivery info, related, JSON-LD) · `/cart` (persistent, quantity, remove, stock limits, server prices) · `/checkout` (contact, Indian address, shipping option, summary) · `/checkout/payment/[ref]` (demo payment: success / failure / retry / cancel) · `/order/[ref]` (confirmation + status tracker) · `/order-status` (lookup by reference + email) · `/about /contact /shipping /returns /privacy /terms` (clearly labelled sample text) · 404 and error pages · `sitemap.xml`, `robots.txt` (demo is `noindex`).

**Admin** (`/admin`, backend-enforced auth) — login · dashboard (needs-action count, 7-day orders, paid revenue, orders by status, low/sold-out stock, recent orders) · orders list (status tabs, search) · order detail (status transitions, tracking reference, fulfilment notes, payment attempts, history) · products (create/edit/archive/restore, price & stock, images by URL or upload) · collections (create/edit/archive) · shipping (rates, free-above threshold, enable/disable).

## 4. Business rules
* Money = integer **paise**, displayed as INR.
* Server recomputes price, availability, shipping, totals; the browser sends only product ids and quantities.
* Max 10 per line; quantity ≤ stock. Stock can never go negative (row lock **and** DB `CHECK`).
* Shipping: flat-rate (default ₹150, free from ₹25,000) and local pickup (₹0, no address). Admin-editable. No courier integration; admin ships manually and records a tracking reference (required to ship delivery orders).
* Order states: `pending_payment → new → confirmed → packed → shipped → delivered`; `cancelled` from any pre-shipped state. Payment states: `unpaid / failed / paid / refund_due`. Details in ARCHITECTURE.md.
* Unpaid orders hold stock for 30 minutes, then release automatically.
* Failed payment never produces a paid order; retries are safe; a paid order cannot be charged twice.
* Cancelling a paid order restores stock and marks `refund_due` (refund is a manual, out-of-system step).

## 5. Assumptions
Single currency (INR), India-only addresses (36 states/UTs, 6-digit PIN, 10-digit mobile), prices tax-inclusive (sample), one admin role, single shop location, low order volume (single API instance).

## 6. Acceptance criteria (each is covered by an automated test; see TEST_REPORT.md)
1. Listing filters by category, colour, price range (paise), search text (wildcards escaped), in-stock; sorts; paginates; sold-out items sort last; archived items never appear.
2. Quote returns server prices; client-supplied prices/totals are ignored; shipping is flat/free-above/pickup; lines are clamped to stock and flagged when unavailable.
3. Checkout validates Indian phone, PIN, state; requires address only for delivery; rejects over-stock with details and no side effects.
4. 10 concurrent buyers of 3 remaining units → exactly 3 orders; opposite-order multi-item carts do not deadlock; identical idempotent submissions create one order.
5. Demo payment success → paid/new; failure → unpaid/failed, stock still held; retry succeeds; same attempt key is idempotent; concurrent pays charge once; expired reservation is cancelled and stock released.
6. Order lookup requires matching email; unknown reference and wrong email return identical errors; lookups are rate-limited.
7. Every `/api/v1/admin/*` route returns 401 without a session; wrong password rejected; cookie is httpOnly + SameSite=Lax; cross-origin mutations blocked; deactivated admin loses access.
8. Valid transitions only; repeats rejected (409); cancel restores stock exactly once; shipping needs tracking; unpaid orders cannot be fulfilled.
9. A shopper can go home → filter → product → cart → checkout → pay (demo) → confirmation → track, on desktop and mobile viewports.
10. An admin can sign in and take an order from "received" to "delivered", edit a product and see the storefront change, and archive it.
11. No serious/critical axe violations on 11 key pages at desktop and mobile.

## 7. Demo vs live boundary
| Area | Demo (this repo) | Needed for live |
|---|---|---|
| Payments | Simulated provider; no card data; `PAYMENT_PROVIDER=demo` only | Real gateway integration + webhook (Razorpay requirements in ARCHITECTURE.md). **Not implemented.** |
| Products/photos/prices | Fictional; original illustrations | Client's approved data and photography |
| Shipping | Manual, flat/pickup | Client's regions, rates, courier process |
| Policies/legal | Sample text, labelled | Reviewed by a qualified professional |
| Tax/invoices | "Inclusive of taxes (sample)" | GST registration, invoice format, HSN codes |
| Email/SMS | None | Order confirmation / shipping notifications |
| Indexing | `noindex`, `Disallow: /` | Enable at launch |
| Accounts | Guest only | Optional customer accounts |
