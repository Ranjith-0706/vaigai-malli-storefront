"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { StoredItem } from "./cart";
import type { CartQuote } from "./types";

type State = { key: string; quote: CartQuote | null; error: string | null };

/** Asks the server to price the cart. The browser never computes totals itself. */
export function useQuote(items: StoredItem[], ready: boolean, shippingMethod?: string) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState<State | null>(null);
  const key = `${JSON.stringify(items)}|${shippingMethod ?? ""}|${tick}`;

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    api<CartQuote>("/cart/quote", { method: "POST", json: { items, shipping_method: shippingMethod } })
      .then((quote) => alive && setState({ key, quote, error: null }))
      .catch(
        (e) =>
          alive &&
          setState((s) => ({
            key,
            quote: s?.quote ?? null,
            error: e instanceof ApiError ? e.message : "We could not load your cart. Please check your connection.",
          })),
      );
    return () => {
      alive = false;
    };
    // `key` encodes items + shipping + tick
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, key]);

  const reload = useCallback(async () => setTick((t) => t + 1), []);
  return {
    quote: state?.quote ?? null,
    loading: !ready || state?.key !== key,
    error: state?.key === key ? state.error : null,
    reload,
  };
}
