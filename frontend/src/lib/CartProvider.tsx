"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addItem, CART_KEY, removeItem, sanitize, setQuantity, totalCount, type StoredItem } from "./cart";

type CartCtx = {
  items: StoredItem[];
  count: number;
  ready: boolean;
  add: (id: number, qty?: number, max?: number) => void;
  setQty: (id: number, qty: number) => void;
  remove: (id: number) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<StoredItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    /* Hydrate from localStorage after mount (reading it during render would break SSR hydration). */
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      setItems(sanitize(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")));
    } catch {
      /* storage unavailable or corrupt: start empty */
    }
    setReady(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) {
        try {
          setItems(sanitize(JSON.parse(e.newValue ?? "[]")));
        } catch {
          setItems([]);
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const commit = useCallback((next: StoredItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      /* private mode: the cart then lives for this tab only */
    }
  }, []);

  const value = useMemo<CartCtx>(
    () => ({
      items,
      count: totalCount(items),
      ready,
      add: (id, qty = 1, max) => commit(addItem(items, id, qty, max)),
      setQty: (id, qty) => commit(setQuantity(items, id, qty)),
      remove: (id) => commit(removeItem(items, id)),
      clear: () => commit([]),
    }),
    [items, ready, commit],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}
