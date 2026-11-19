import Link from "next/link";
import { serverApi } from "@/lib/api";
import { activeChips, activeFilterCount, filterStateFromParams, first, resultSummary, toApiQuery, withParams, type SearchParams } from "@/lib/catalogQuery";
import type { ProductPage } from "@/lib/types";
import { FilterBar } from "./FilterBar";
import { ProductGrid } from "./ProductCard";

const COLOR_HEX: Record<string, string> = {
  Maroon: "#7a1424", Ivory: "#efe6d2", Red: "#a3141e", Teal: "#0e5a6b", Green: "#1f5e46", Mustard: "#c9922b",
  Arakku: "#9b1b30", Black: "#1d1a1a", Pink: "#b5245e", Indigo: "#2b3a67", Coral: "#c8553d", Beige: "#c8ad82", Navy: "#1b2748",
};

type Props = {
  basePath: string;
  searchParams: SearchParams;
  collectionSlug?: string;
  /** Shown in the result count, e.g. "4 sarees in Kanchipuram Silk". */
  collectionName?: string;
  eyebrow: string;
  title: string;
  intro?: string;
  breadcrumb?: React.ReactNode;
};

/** Truthful note about the demo art. Rendered as the last grid item so it never reorders products or pagination. */
function EditorialNote() {
  return (
    <li className="col-span-2 self-center border-t border-rule pt-6 md:col-span-3 xl:col-span-2 xl:pr-8">
      <p className="eyebrow">A note on the art</p>
      <h2 className="mt-2 text-3xl leading-tight sm:text-4xl">Drawn, not woven.</h2>
      <p className="mt-3 max-w-md text-[0.95rem] text-muted">
        Every saree in this demo is an original illustration made for the project. The maroons, leaf greens and stepped gold borders are a study of South Indian
        silk palettes, not a record of any real cloth, loom or weaver.
      </p>
      <Link href="/about" className="link mt-4 inline-block text-sm font-semibold">
        About this demo
      </Link>
    </li>
  );
}

export async function Listing({ basePath, searchParams, collectionSlug, collectionName, eyebrow, title, intro, breadcrumb }: Props) {
  const query = toApiQuery(searchParams, collectionSlug ? { collection: collectionSlug } : {});
  const data = await serverApi<ProductPage>(`/products?${query}`);
  const count = activeFilterCount(searchParams);
  const chips = activeChips(basePath, searchParams);
  const page = data.page;
  const q = first(searchParams.q);
  const showNote = !collectionSlug && count === 0 && page === 1 && data.items.length >= 8;

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      {breadcrumb}
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-1 pb-5">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-1 text-4xl sm:text-5xl">{title}</h1>
        </div>
        <p className="pb-1 text-sm text-muted" role="status" aria-live="polite" data-testid="result-count">
          {resultSummary(data.total, { collectionName, q })}
        </p>
      </header>
      {intro && <p className="-mt-2 mb-5 max-w-2xl text-muted">{intro}</p>}

      <FilterBar
        basePath={basePath}
        categories={data.facets.categories}
        colors={data.facets.colors.map((c) => ({ name: c, hex: COLOR_HEX[c] ?? "#999" }))}
        state={filterStateFromParams(searchParams)}
        activeCount={count}
      />

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-4" data-testid="active-filters">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Active</span>
          <ul className="flex flex-wrap gap-2" aria-label="Active filters">
            {chips.map((c) => (
              <li key={c.key}>
                <Link href={c.href} scroll={false} aria-label={`Remove filter: ${c.label}`} className="inline-flex min-h-8 items-center gap-2 border border-rule px-2.5 text-[0.82rem] hover:border-maroon hover:text-maroon">
                  {c.label}
                  <span aria-hidden="true" className="text-base leading-none">
                    ×
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link href={basePath} scroll={false} className="link ml-1 text-sm">
            Clear all
          </Link>
        </div>
      )}

      <section id="results" aria-label="Results" className="scroll-mt-28 pt-8">
        {data.items.length === 0 ? (
          <div className="border-t border-rule px-2 py-16 text-center" data-testid="empty-state">
            <p className="eyebrow">Nothing found</p>
            <h2 className="mt-2 text-4xl">No sarees match these filters</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">Try removing a colour or widening the price range{q ? ", or check the spelling of your search" : ""}.</p>
            <Link href={basePath} className="btn btn-primary mt-7">
              Clear all filters
            </Link>
          </div>
        ) : (
          <ProductGrid items={data.items} priorityCount={4}>
            {showNote && <EditorialNote />}
          </ProductGrid>
        )}

        {data.pages > 1 && (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6 border-t border-line pt-6">
            {page > 1 ? (
              <Link className="link text-sm font-semibold" href={withParams(basePath, searchParams, { page: String(page - 1) })} rel="prev">
                ← Previous
              </Link>
            ) : null}
            <span className="text-sm text-muted">
              Page {page} of {data.pages}
            </span>
            {page < data.pages ? (
              <Link className="link text-sm font-semibold" href={withParams(basePath, searchParams, { page: String(page + 1) })} rel="next">
                Next →
              </Link>
            ) : null}
          </nav>
        )}
      </section>
    </div>
  );
}
