"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/lib/CartProvider";

export function AddToCart({ productId, stock, name }: { productId: number; stock: number; name: string }) {
  const { items, add, ready } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const inCart = items.find((i) => i.product_id === productId)?.quantity ?? 0;
  const max = Math.max(0, Math.min(stock, 10) - inCart);

  if (stock <= 0) {
    return (
      <div className="border border-line bg-parchment px-4 py-3 text-sm" role="status">
        This saree is sold out in the demo stock.
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="qty" className="label">
            Quantity
          </label>
          <div className="flex items-center border-[1.5px] border-[#c9b78f] bg-[#fffdf7]">
            <button type="button" className="grid h-11 w-11 place-items-center text-xl text-maroon disabled:opacity-40" aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>
              −
            </button>
            <input
              id="qty"
              value={Math.min(qty, Math.max(1, max))}
              readOnly
              aria-live="polite"
              className="h-11 w-10 border-0 bg-transparent text-center font-semibold"
              inputMode="numeric"
            />
            <button type="button" className="grid h-11 w-11 place-items-center text-xl text-maroon disabled:opacity-40" aria-label="Increase quantity" disabled={qty >= max} onClick={() => setQty((q) => Math.min(max, q + 1))}>
              +
            </button>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-primary min-w-48 flex-1 sm:flex-none"
          disabled={!ready || max <= 0}
          onClick={() => {
            add(productId, Math.min(qty, max), stock);
            setAdded(true);
            setQty(1);
          }}
        >
          {max <= 0 ? "Maximum in cart" : "Add to cart"}
        </button>
      </div>
      <p className="mt-3 text-sm" role="status" aria-live="polite">
        {added && (
          <span className="text-leaf">
            ✓ {name} added.{" "}
            <Link href="/cart" className="link font-semibold">
              View cart
            </Link>
          </span>
        )}
        {!added && inCart > 0 && <span className="text-muted">{inCart} already in your cart.</span>}
      </p>
    </div>
  );
}
