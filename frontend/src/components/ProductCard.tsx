import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

export function Price({ paise, compareAt, className = "" }: { paise: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold tabular-nums text-maroon-deep">{formatINR(paise)}</span>
      {compareAt && compareAt > paise && (
        <>
          {" "}
          <s className="text-sm text-muted" aria-label={`was ${formatINR(compareAt)}`}>
            {formatINR(compareAt)}
          </s>
        </>
      )}
    </span>
  );
}

export function StockBadge({ p, className = "" }: { p: Pick<ProductSummary, "in_stock" | "low_stock" | "stock">; className?: string }) {
  if (!p.in_stock) return <span className={`text-sm font-semibold text-danger ${className}`}>Sold out</span>;
  if (p.low_stock) return <span className={`text-sm font-semibold text-gold-ink ${className}`}>Only {p.stock} left</span>;
  return <span className={`text-sm font-semibold text-leaf ${className}`}>In stock</span>;
}

export function ProductCard({ p, priority = false }: { p: ProductSummary; priority?: boolean }) {
  const note = !p.in_stock ? "Sold out" : p.low_stock ? `Only ${p.stock} left` : null;
  return (
    <article className="card group relative" data-testid="product-card">
      <Link
        href={`/products/${p.slug}`}
        className="block"
        aria-label={`${p.name}, ${p.color}, ${formatINR(p.price_paise)}${note ? `, ${note.toLowerCase()}` : ""}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-parchment">
          <img
            src={p.image_url}
            alt={p.image_alt}
            width={750}
            height={1000}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`card-img h-full w-full object-cover ${p.in_stock ? "" : "opacity-55 grayscale-[35%]"}`}
          />
          {p.hover_image_url && (
            <img
              src={p.hover_image_url}
              alt=""
              aria-hidden="true"
              width={750}
              height={1000}
              loading="lazy"
              decoding="async"
              className={`card-alt absolute inset-0 h-full w-full object-cover ${p.in_stock ? "" : "opacity-55 grayscale-[35%]"}`}
            />
          )}
          {!p.in_stock && (
            <span className="absolute inset-x-0 bottom-0 bg-ivory/90 py-1.5 text-center text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-ink">Sold out</span>
          )}
        </div>
        <div className="pt-3.5">
          <h3 className="text-[1.3rem] leading-[1.15] group-hover:text-maroon">{p.name}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-[0.8rem] text-muted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-ink/20" style={{ background: p.color_hex }} />
            {p.color} · {p.category}
          </p>
          <p className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3">
            <Price paise={p.price_paise} compareAt={p.compare_at_paise} />
            {note && <span className={`text-[0.72rem] font-semibold uppercase tracking-[0.16em] ${p.in_stock ? "text-gold-ink" : "text-ink"}`}>{note}</span>}
          </p>
        </div>
      </Link>
    </article>
  );
}

/** `children` are extra <li> items rendered after the products, so they never reorder or interrupt them. */
export function ProductGrid({ items, priorityCount = 0, children }: { items: ProductSummary[]; priorityCount?: number; children?: React.ReactNode }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 md:grid-cols-3 xl:grid-cols-4" aria-label="Sarees">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} priority={i < priorityCount} />
        </li>
      ))}
      {children}
    </ul>
  );
}
