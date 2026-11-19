import Link from "next/link";
import { serverApi } from "@/lib/api";
import { activeFilterCount, asArray, first, toApiQuery, withParams, type SearchParams } from "@/lib/catalogQuery";
import { formatINR } from "@/lib/format";
import type { ProductPage } from "@/lib/types";
import { FilterPanel } from "./FilterPanel";
import { ProductGrid } from "./ProductCard";

const COLOR_HEX: Record<string, string> = {
  Maroon: "#7a1424", Ivory: "#efe6d2", Red: "#a3141e", Teal: "#0e5a6b", Green: "#1f5e46", Mustard: "#c9922b",
  Arakku: "#9b1b30", Black: "#1d1a1a", Pink: "#b5245e", Indigo: "#2b3a67", Coral: "#c8553d", Beige: "#c8ad82", Navy: "#1b2748",
};

export async function Listing({ basePath, searchParams, collectionSlug }: { basePath: string; searchParams: SearchParams; collectionSlug?: string }) {
  const query = toApiQuery(searchParams, collectionSlug ? { collection: collectionSlug } : {});
  const data = await serverApi<ProductPage>(`/products?${query}`);
  const count = activeFilterCount(searchParams);
  const page = data.page;

  const priceNote =
    first(searchParams.min) || first(searchParams.max)
      ? ` priced ${first(searchParams.min) ? "from " + formatINR(Number(first(searchParams.min)) * 100) : ""} ${first(searchParams.max) ? "up to " + formatINR(Number(first(searchParams.max)) * 100) : ""}`
      : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[17rem_1fr] lg:gap-12">
      <aside aria-label="Filters" className="lg:sticky lg:top-32 lg:self-start">
        <FilterPanel
          basePath={basePath}
          categories={data.facets.categories}
          colors={data.facets.colors.map((c) => ({ name: c, hex: COLOR_HEX[c] ?? "#999" }))}
          activeCount={count}
          selected={{
            q: first(searchParams.q),
            category: asArray(searchParams.category),
            color: asArray(searchParams.color),
            min: first(searchParams.min),
            max: first(searchParams.max),
            sort: first(searchParams.sort),
            inStock: first(searchParams.in_stock) === "true",
          }}
        />
      </aside>

      <section aria-label="Results">
        <p className="mb-6 text-sm text-muted" role="status" aria-live="polite" data-testid="result-count">
          {data.total} {data.total === 1 ? "saree" : "sarees"}
          {first(searchParams.q) && <> matching &ldquo;{first(searchParams.q)}&rdquo;</>}
          {priceNote}
        </p>

        {data.items.length === 0 ? (
          <div className="border border-dashed border-line bg-parchment/50 px-6 py-16 text-center" data-testid="empty-state">
            <h2 className="text-3xl">No sarees match these filters</h2>
            <p className="mx-auto mt-3 max-w-md text-muted">Try removing a colour or widening the price range{first(searchParams.q) ? ", or check the spelling of your search" : ""}.</p>
            <Link href={basePath} className="btn btn-primary mt-6">
              Clear all filters
            </Link>
          </div>
        ) : (
          <ProductGrid items={data.items} priorityCount={4} />
        )}

        {data.pages > 1 && (
          <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-2">
            {page > 1 ? (
              <Link className="btn btn-outline btn-sm" href={withParams(basePath, searchParams, { page: String(page - 1) })} rel="prev">
                ← Previous
              </Link>
            ) : null}
            <span className="px-3 text-sm text-muted">
              Page {page} of {data.pages}
            </span>
            {page < data.pages ? (
              <Link className="btn btn-outline btn-sm" href={withParams(basePath, searchParams, { page: String(page + 1) })} rel="next">
                Next →
              </Link>
            ) : null}
          </nav>
        )}
      </section>
    </div>
  );
}
