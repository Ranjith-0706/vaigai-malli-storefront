# Design redesign report — "boutique" storefront

Branch: `redesign/boutique-shop` (not merged; `main` is untouched). Date: 2026-11-19.

Everything on this page is a fictional portfolio demo. The sarees are original illustrations, and none of the redesign copy claims a weaver, a provenance, a handwoven guarantee, a certification or a customer review. Kanakavalli, Sundari Silks and Nalli were used only as a reference for *restraint and product-first presentation*; no layout, text, branding or image was copied.

## 1. What changed and why

| Area | Before | After | Reason |
|---|---|---|---|
| `/shop` heading | Large eyebrow + 6xl title + rule (~170 px before any control) | One compact row: eyebrow + title at left, live result count at right | The first product row is fully visible at 1440×900 (images start ≈ y 310, prices end ≈ y 780) |
| Filters (desktop) | 17 rem sticky sidebar, always expanded | One horizontal bar between two fine gold rules: search, Fabric, Colour, Price popovers, "In stock only", Sort | Products get the full width; filters become a quiet tool bar |
| Filters (narrow) | Toggle + stacked form, auto-submit | "Filters & sort (n)" toggle → accordion groups → sticky **Show results** / **Clear all** | Changes are *staged* so each tap does not reload the grid; apply and clear are always reachable |
| Active filters | Not shown | Removable chips (plain links) + "Clear all", e.g. `Soft Silk ×`, `From ₹5,000 ×`, `Search: “ivory” ×` | Visible state; works without JS and with back/forward |
| Result count | "15 sarees" + price note | `15 sarees`, `4 sarees in Kanchipuram Silk`, `3 sarees matching “ivory”` | Names the active collection / search term |
| Product card | Boxed card, 4:5 image, coloured corner badges, uppercase category·colour line, hover zoom | 3:4 portrait, no badges, name (Cormorant) → `● Colour · Category` → price + quiet stock note; sold-out band; second image fades in on hover/focus | Quiet typography; the artwork leads |
| Shadows / boxes | `shadow-card` on the home hero frame and caption, drawer shadow, boxed empty state, boxed order summary | Removed from the storefront (the temple-arch hero frame is kept, as the brand motif); order summary uses a gold top rule | Brief: no card shadows or generic boxing |
| Tokens | Ivory `#fbf6ea` | Raw-silk ivory `#f9f2e1` with a ~4 % fractal-noise "slub" texture, `--color-rule` gold hairline | Warmer ground, fine rules |
| Buttons | Sentence-case 0.95 rem | Storefront buttons: small tracked capitals with a gold inner hairline. Scoped to `.shop-ui` so the **admin console keeps its own button style** | One brand voice, admin unchanged |
| Header / footer | Heavier nav and a zig-zag gopuram strip above the footer | Capitals-tracked nav, thinner demo banner, gold hairline under header; footer topped by a single gold rule, columns re-weighted (wide brand column) | Restraint; ornament now lives only in the logo mark and the hero arch |
| Product / cart / checkout | 5xl–6xl headings, 12 rem top padding, bordered gallery frame | Compact headings with a gold rule, tighter spacing, unframed gallery, "You may also like" under a fine rule | Same typographic system as `/shop` |

Typography stays Cormorant Garamond + Hanken Grotesk; nothing was swapped.

### Truthfulness fixes made on the way
Marketing copy that read as provenance or a handloom claim was softened: header lockup "Silks & handlooms" → "Silk sarees · demo"; hero line "Madurai · Kanchipuram · Handloom" → "Temple-border silk · Illustrated demo"; site tagline "…handloom cottons" → "…everyday cottons". Category *names* stored in the seed data (e.g. "Handloom Cotton") are unchanged because they are catalogue data, and `About` already states that no weaver, cooperative or certification is claimed. No certification logos or badges appear anywhere (an e2e test asserts this on the listing).

### Second-image crossfade (implemented)
The listing API only returned one image, so it now returns **`hover_image_url`**: the product's second image by position (the border close-up in the seed data), or `null` if there is only one. Products already load their images, so this adds no extra request or query. The second `<img>` is `alt=""` / `aria-hidden` (decorative), fades in on `:hover` (only on `(hover: hover)` devices) and on `:focus-within` for keyboard users, and respects `prefers-reduced-motion`. Touch devices keep the single image; every card is still fully understandable from text (name, colour, category, price, stock note, and a descriptive link `aria-label`).

### The one editorial card
"Drawn, not woven." — *"Every saree in this demo is an original illustration made for the project… not a record of any real cloth, loom or weaver."* It is the **last `<li>`** of the product list, so it never reorders products, never splits pagination, and is read after the products by screen readers. It only appears on `/shop` page 1 with no filters.

### Filters deliberately not added
**Zari Type** and **Occasion** are omitted: the data model has no such fields, and inventing them would break the "no invented provenance" rule. Adding them properly needs product fields, seed data, API filtering, URL handling and tests.

## 2. Filter behaviour (URL contract unchanged)

Parameters preserved exactly: `q`, `category` (repeatable), `color` (repeatable), `min`, `max` (rupees), `in_stock`, `sort`, `page`. Collection routes (`/collections/[slug]`) use the same component.

* **URL is the single source of truth.** The form state is re-synced whenever the URL changes, so back/forward and chip links update the controls.
* **Desktop (≥ 1024 px):** every change navigates at once (`router.push`, no scroll jump); price/search apply with Enter or the panel's *Apply*. Popovers are native `<details>`: one open at a time, Escape closes and returns focus to the summary, clicking or tabbing away closes.
* **Narrower screens:** changes are staged; **Show results** applies, collapses the sheet and scrolls to the results; **Clear all** resets.
* **Page resets** to 1 on any filter change; other params are kept. The default sort (`featured`) is omitted from the URL.
* **No JavaScript:** the bar is a real GET form. On desktop widths the groups open natively and *Apply* submits (tested). On phones the sheet toggle needs JavaScript — a limitation (§5).

Pure helpers in `src/lib/catalogQuery.ts` (`buildFilterHref`, `activeChips`, `resultSummary`, `filterStateFromParams`) hold the URL logic and are unit-tested.

## 3. Files changed

Backend: `app/schemas.py`, `app/services/catalog.py` (`hover_image_url`), `tests/test_catalog.py` (+1 test).

Frontend:
* New: `src/components/FilterBar.tsx`, `e2e/shop-filters.spec.ts`, `scripts/redesign-shots.mjs`.
* Removed: `src/components/FilterPanel.tsx` (replaced by `FilterBar`).
* Rewritten: `src/components/Listing.tsx` (heading, count, chips, empty state, editorial note, pagination), `src/components/ProductCard.tsx`.
* Edited: `src/app/globals.css`, `src/lib/catalogQuery.ts`, `src/lib/types.ts`, `src/lib/site.ts`, `SiteHeader.tsx`, `SiteFooter.tsx`, `Gallery.tsx`, `OrderSummary.tsx`, and pages `(shop)/layout.tsx` (adds `.shop-ui`), `shop/page.tsx`, `collections/[slug]/page.tsx`, `products/[slug]/page.tsx`, `cart/page.tsx`, `checkout/page.tsx`, `page.tsx` (home: shadows and hero line).
* Tests: `src/lib/lib.test.ts`, `src/components/components.test.tsx`, `e2e/customer.spec.ts` (filter helper for the new UI), `e2e/a11y.spec.ts` (+ a filtered-shop scan).
* Not touched: the admin console pages, API contracts other than the one additive field, the checkout/payment logic.

## 4. Tests and results (run on this branch, 2026-11-19)

| Command | Result |
|---|---|
| `ruff check .` / `ruff format --check .` / `mypy app` (backend) | all pass (28 files formatted, 20 source files) |
| `pytest --cov=app` (backend, real PostgreSQL) | **61 passed**, coverage 88 % |
| `npm run lint` | 0 errors |
| `npx tsc --noEmit` | pass |
| `npm test` (Vitest) | **22 passed** (was 16; +6: URL/chips/summary helpers, card subtitle, second image) |
| `npm run build` | compiled successfully |
| `npx playwright test` (desktop + mobile, own DB/ports) | **57 passed, 2 skipped, 0 failed** (3.1 min). The 2 skips are the intentionally desktop-only no-JS test and popover test on the mobile project |

New browser coverage (`e2e/shop-filters.spec.ts`, 11 tests × 2 projects): filtered URL → exact count and one chip per filter; chip removal, **back/forward** restoring state and chips; controls re-sync from the URL; page reset on filter change; desktop-instant vs mobile-staged apply; price range with Enter; count text for collection and search; card content (portrait ratio, `Colour · Category` subtitle, stock notes, decorative second image, no certification text); editorial note position and conditions; popover Escape/one-at-a-time + axe with a popover open; the **no-JavaScript GET form**. Axe now also scans a filtered `/shop` URL (no serious/critical issues).

One test failed during development because it assumed a fixed catalogue total while another spec adds products; it now asserts relative to what is displayed.

`docs/TEST_REPORT.md` still describes the pre-redesign run on `main` (109 tests); the numbers above are the current ones for this branch.

## 5. Screenshots

`docs/screenshots/redesign/` — `before-*` and `after-*`, at desktop 1440×900, tablet 820×1100 (shop only) and mobile 390×844 @2x:
`shop-fold`, `shop-full`, `shop-filtered`, `shop-empty`, `collection`, `product`, `checkout`; plus `after-*-shop-filter-open` (desktop colour popover; tablet/mobile sheet). Regenerate with `node scripts/redesign-shots.mjs <before|after>` (dev stack running).

Problems seen in review and fixed: footer column titles rendered in the serif display face (a global `h2` rule outranked the utility class) → set the sans family explicitly; tablet width had no filter-open shot because the sheet, not the popovers, applies below 1024 px → script corrected.

## 6. Remaining limitations

1. **Phones without JavaScript** cannot open the filter sheet (desktop-width no-JS works). Making the sheet a native `<details>` would fix it.
2. The desktop popover is a hand-rolled menu on native `<details>`; it is tested with keyboard and axe but not with a screen reader or real devices (Chromium emulation only).
3. Hover crossfade is invisible on touch devices by design.
4. The portrait 3:4 crop trims a few percent from the sides of the 4:5 illustrations; real photography would be shot to the grid.
5. Colour swatches in the filter come from a hard-coded name→hex map in `Listing.tsx`; a newly created colour falls back to grey.
6. The admin console was not redesigned; it picks up only the new base colours and fonts.
7. Not run: Lighthouse/performance budgets, cross-browser (Firefox/Safari), real-device checks, and the GitHub Actions workflow.
8. Nothing is committed: the branch holds the work as uncommitted changes in the working tree for review.
