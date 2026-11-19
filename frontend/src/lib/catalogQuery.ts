import { rupeesToPaise } from "./format";

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
