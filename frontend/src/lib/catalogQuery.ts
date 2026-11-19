import { formatINR, rupeesToPaise } from "./format";

export type SearchParams = Record<string, string | string[] | undefined>;

export const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "name", label: "Name A–Z" },
] as const;

const SORT_VALUES: string[] = SORTS.map((s) => s.value);

export function asArray(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  return (Array.isArray(v) ? v : [v]).filter(Boolean);
}

export function first(v: string | string[] | undefined): string {
  return asArray(v)[0] ?? "";
}

/** Translate public URL params (prices in rupees) into the API query string (prices in paise). */
export function toApiQuery(sp: SearchParams, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams();
  const text = first(sp.q).trim().slice(0, 100);
  if (text) q.set("q", text);
  asArray(sp.category).forEach((c) => q.append("category", c));
  asArray(sp.color).forEach((c) => q.append("color", c));
  const min = rupeesToPaise(first(sp.min));
  const max = rupeesToPaise(first(sp.max));
  if (min !== null) q.set("min_price", String(min));
  if (max !== null) q.set("max_price", String(max));
  if (first(sp.in_stock) === "true") q.set("in_stock", "true");
  const sort = first(sp.sort);
  if (SORT_VALUES.includes(sort)) q.set("sort", sort);
  const page = Number.parseInt(first(sp.page), 10);
  if (Number.isInteger(page) && page > 1) q.set("page", String(page));
  q.set("page_size", "12");
  Object.entries(extra).forEach(([k, v]) => q.set(k, v));
  return q.toString();
}

/** Rebuild a page URL from search params, overriding some keys. */
export function withParams(basePath: string, sp: SearchParams, override: Record<string, string | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k in override) continue;
    asArray(v).forEach((x) => q.append(k, x));
  }
  for (const [k, v] of Object.entries(override)) if (v !== null && v !== "") q.set(k, v);
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export function activeFilterCount(sp: SearchParams): number {
  return (
    asArray(sp.category).length +
    asArray(sp.color).length +
    (first(sp.min) ? 1 : 0) +
    (first(sp.max) ? 1 : 0) +
    (first(sp.in_stock) === "true" ? 1 : 0) +
    (first(sp.q) ? 1 : 0)
  );
}

export type FilterState = {
  q: string;
  category: string[];
  color: string[];
  min: string;
  max: string;
  inStock: boolean;
  sort: string;
};

export function filterStateFromParams(sp: SearchParams): FilterState {
  return {
    q: first(sp.q),
    category: asArray(sp.category),
    color: asArray(sp.color),
    min: first(sp.min),
    max: first(sp.max),
    inStock: first(sp.in_stock) === "true",
    sort: SORT_VALUES.includes(first(sp.sort)) ? first(sp.sort) : "featured",
  };
}

/** Public URL for a filter state. Empty values and the default sort are omitted; `page` is always reset. */
export function buildFilterHref(basePath: string, f: FilterState): string {
  const q = new URLSearchParams();
  if (f.q.trim()) q.set("q", f.q.trim());
  f.category.forEach((c) => q.append("category", c));
  f.color.forEach((c) => q.append("color", c));
  if (f.min.trim()) q.set("min", f.min.trim());
  if (f.max.trim()) q.set("max", f.max.trim());
  if (f.inStock) q.set("in_stock", "true");
  if (f.sort && f.sort !== "featured") q.set("sort", f.sort);
  const s = q.toString();
  return s ? `${basePath}?${s}` : basePath;
}

export type FilterChip = { key: string; label: string; href: string };

/** One removable chip per active filter; each `href` is the current state minus that filter (a plain link, so it works without JS). */
export function activeChips(basePath: string, sp: SearchParams): FilterChip[] {
  const f = filterStateFromParams(sp);
  const href = (patch: Partial<FilterState>) => buildFilterHref(basePath, { ...f, ...patch });
  const chips: FilterChip[] = [];
  if (f.q.trim()) chips.push({ key: "q", label: `Search: “${f.q.trim()}”`, href: href({ q: "" }) });
  f.category.forEach((c) => chips.push({ key: `category:${c}`, label: c, href: href({ category: f.category.filter((x) => x !== c) }) }));
  f.color.forEach((c) => chips.push({ key: `color:${c}`, label: c, href: href({ color: f.color.filter((x) => x !== c) }) }));
  const min = rupeesToPaise(f.min);
  const max = rupeesToPaise(f.max);
  if (min !== null) chips.push({ key: "min", label: `From ${formatINR(min)}`, href: href({ min: "" }) });
  if (max !== null) chips.push({ key: "max", label: `Up to ${formatINR(max)}`, href: href({ max: "" }) });
  if (f.inStock) chips.push({ key: "in_stock", label: "In stock only", href: href({ inStock: false }) });
  return chips;
}

/** "15 sarees", "4 sarees in Kanchipuram Silk", "3 sarees matching “ivory”". */
export function resultSummary(total: number, opts: { collectionName?: string; q?: string }): string {
  let s = `${total} ${total === 1 ? "saree" : "sarees"}`;
  if (opts.collectionName) s += ` in ${opts.collectionName}`;
  if (opts.q?.trim()) s += ` matching “${opts.q.trim()}”`;
  return s;
}
