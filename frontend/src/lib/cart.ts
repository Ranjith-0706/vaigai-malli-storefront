/** Pure cart helpers. The cart persists in localStorage; prices are always re-quoted by the server. */
export type StoredItem = { product_id: number; quantity: number };

export const CART_KEY = "vm_cart_v1";
export const MAX_LINE_QTY = 10;

export function sanitize(raw: unknown): StoredItem[] {
  if (!Array.isArray(raw)) return [];
  const merged = new Map<number, number>();
  for (const r of raw) {
    const id = Number((r as StoredItem)?.product_id);
    const qty = Math.floor(Number((r as StoredItem)?.quantity));
    if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(qty) || qty < 1) continue;
    merged.set(id, Math.min(MAX_LINE_QTY, (merged.get(id) ?? 0) + qty));
  }
  return [...merged].map(([product_id, quantity]) => ({ product_id, quantity }));
}

export function addItem(items: StoredItem[], id: number, qty = 1, max = MAX_LINE_QTY): StoredItem[] {
  const cap = Math.max(1, Math.min(max, MAX_LINE_QTY));
  const existing = items.find((i) => i.product_id === id);
  if (!existing) return [...items, { product_id: id, quantity: Math.max(1, Math.min(qty, cap)) }];
  return items.map((i) => (i.product_id === id ? { ...i, quantity: Math.min(cap, i.quantity + qty) } : i));
}

export function setQuantity(items: StoredItem[], id: number, qty: number): StoredItem[] {
  if (qty <= 0) return items.filter((i) => i.product_id !== id);
  return items.map((i) => (i.product_id === id ? { ...i, quantity: Math.min(MAX_LINE_QTY, qty) } : i));
}

export function removeItem(items: StoredItem[], id: number): StoredItem[] {
  return items.filter((i) => i.product_id !== id);
}

export function totalCount(items: StoredItem[]): number {
  return items.reduce((n, i) => n + i.quantity, 0);
}
