import Link from "next/link";
import { formatINR } from "@/lib/format";
import type { ProductSummary } from "@/lib/types";

export function Price({ paise, compareAt, className = "" }: { paise: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={className}>
      <span className="font-semibold text-maroon-deep">{formatINR(paise)}</span>
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
  return (
    <article className="card group relative" data-testid="product-card">
      <Link href={`/products/${p.slug}`} className="block" aria-label={`${p.name}, ${formatINR(p.price_paise)}${p.in_stock ? "" : ", sold out"}`}>
        <div className="relative aspect-[4/5] overflow-hidden bg-parchment">
          <img
            src={p.image_url}
            alt={p.image_alt}
            width={800}
            height={1000}
            loading={priority ? "eager" : "lazy"}
            decoding="async"
            className={`card-img h-full w-full object-cover ${p.in_stock ? "" : "opacity-60 grayscale-[35%]"}`}
          />
          {!p.in_stock && (
            <span className="absolute left-3 top-3 bg-ink px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ivory">Sold out</span>
          )}
          {p.in_stock && p.low_stock && (
            <span className="absolute left-3 top-3 bg-gold px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-maroon-deep">
              Only {p.stock} left
            </span>
          )}
          {p.compare_at_paise && p.compare_at_paise > p.price_paise && p.in_stock && !p.low_stock && (
            <span className="absolute left-3 top-3 bg-maroon px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ivory">Offer</span>
          )}
        </div>
        <div className="pt-3.5">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-muted">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full border border-ink/20" style={{ background: p.color_hex }} />
            {p.category} · {p.color}
          </p>
          <h3 className="mt-1 text-[1.35rem] leading-tight group-hover:text-maroon">{p.name}</h3>
          <Price paise={p.price_paise} compareAt={p.compare_at_paise} className="mt-1 block" />
        </div>
      </Link>
    </article>
  );
}

export function ProductGrid({ items, priorityCount = 0 }: { items: ProductSummary[]; priorityCount?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-9 md:grid-cols-3 xl:grid-cols-4" aria-label="Sarees">
      {items.map((p, i) => (
        <li key={p.id}>
          <ProductCard p={p} priority={i < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
