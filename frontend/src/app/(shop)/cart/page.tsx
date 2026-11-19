"use client";

import Link from "next/link";
import { useEffect } from "react";
import { OrderSummary } from "@/components/OrderSummary";
import { useCart } from "@/lib/CartProvider";
import { formatINR } from "@/lib/format";
import { useQuote } from "@/lib/useQuote";

export default function CartPage() {
  const { items, ready, setQty, remove } = useCart();
  const { quote, loading, error, reload } = useQuote(items, ready);

  // Server is the source of truth: lower quantities that exceed stock.
  useEffect(() => {
    quote?.lines.forEach((l) => {
      if (l.status === "reduced") setQty(l.product_id, l.quantity);
    });
  }, [quote, setQty]);

  if (ready && items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center" data-testid="empty-cart">
        <h1 className="text-5xl">Your cart is empty</h1>
        <p className="mt-4 text-muted">Sarees you add will wait here, even if you close the tab.</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Browse sarees
        </Link>
      </div>
    );
  }

  const blocking = quote?.lines.filter((l) => l.status === "out_of_stock" || l.status === "unavailable") ?? [];
  const goodLines = quote?.lines.filter((l) => l.status === "ok" || l.status === "reduced") ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="text-5xl sm:text-6xl">Your cart</h1>

      {error && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          {error}
          <button className="btn btn-outline btn-sm" onClick={() => void reload()}>
            Try again
          </button>
        </div>
      )}

      {!quote && loading && (
        <div className="mt-10 space-y-4" aria-busy="true" aria-label="Loading cart">
          {[0, 1].map((i) => (
            <div key={i} className="h-28 animate-pulse bg-parchment" />
          ))}
        </div>
      )}

      {quote && (
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]" aria-busy={loading}>
          <div>
            {blocking.length > 0 && (
              <div role="alert" className="mb-6 border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
                Some items can&rsquo;t be purchased right now. Remove them to continue:
                <ul className="mt-1 list-disc pl-5">
                  {blocking.map((l) => (
                    <li key={l.product_id}>
                      {l.name} — {l.status === "out_of_stock" ? "sold out" : "no longer available"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ul className="divide-y divide-line border-y border-line">
              {quote.lines.map((l) => {
                const ok = l.status === "ok" || l.status === "reduced";
                return (
                  <li key={l.product_id} className="grid grid-cols-[5.5rem_1fr] gap-4 py-5 sm:grid-cols-[7rem_1fr_auto]" data-testid="cart-line">
                    <div className="aspect-[4/5] bg-parchment">{l.image_url && <img src={l.image_url} alt="" width={112} height={140} className="h-full w-full object-cover" />}</div>
                    <div className="min-w-0">
                      {l.slug ? (
                        <Link href={`/products/${l.slug}`} className="font-display text-2xl font-semibold text-maroon-deep hover:text-maroon">
                          {l.name}
                        </Link>
                      ) : (
                        <p className="font-display text-2xl font-semibold">{l.name}</p>
                      )}
                      {ok && <p className="text-sm text-muted">{formatINR(l.unit_price_paise)} each</p>}
                      {l.status === "reduced" && <p className="mt-1 text-sm text-gold-ink">Only {l.max_quantity} in stock, so we updated your quantity.</p>}
                      {ok && (
                        <div className="mt-3 flex items-center gap-4">
                          <div className="flex items-center border-[1.5px] border-[#c9b78f] bg-[#fffdf7]" role="group" aria-label={`Quantity for ${l.name}`}>
                            <button type="button" className="grid h-10 w-10 place-items-center text-lg text-maroon" aria-label={`Decrease quantity of ${l.name}`} onClick={() => setQty(l.product_id, l.quantity - 1)}>
                              −
                            </button>
                            <span className="w-8 text-center font-semibold" aria-live="polite">
                              {l.quantity}
                            </span>
                            <button type="button" className="grid h-10 w-10 place-items-center text-lg text-maroon disabled:opacity-40" aria-label={`Increase quantity of ${l.name}`} disabled={l.quantity >= l.max_quantity} onClick={() => setQty(l.product_id, l.quantity + 1)}>
                              +
                            </button>
                          </div>
                          {l.quantity >= l.max_quantity && <span className="text-xs text-muted">Max available</span>}
                        </div>
                      )}
                      <button type="button" className="link mt-3 text-sm" onClick={() => remove(l.product_id)} aria-label={`Remove ${l.name} from cart`}>
                        Remove
                      </button>
                    </div>
                    {ok && <p className="col-span-2 text-right font-semibold sm:col-span-1">{formatINR(l.line_total_paise)}</p>}
                  </li>
                );
              })}
            </ul>
            <Link href="/shop" className="link mt-6 inline-block text-sm font-semibold">
              ← Continue shopping
            </Link>
          </div>

          <div className="lg:sticky lg:top-32 lg:self-start">
            <OrderSummary
              lines={goodLines.map((l) => ({ key: l.product_id, name: l.name, quantity: l.quantity, total: l.line_total_paise }))}
              subtotal={quote.subtotal_paise}
              shipping={null}
              total={null}
              note={
                quote.free_shipping_remaining_paise
                  ? `Add ${formatINR(quote.free_shipping_remaining_paise)} more for free flat-rate delivery. Shipping is confirmed at checkout.`
                  : "Shipping is confirmed at checkout."
              }
            />
            {blocking.length > 0 || goodLines.length === 0 ? (
              <button className="btn btn-primary mt-4 w-full" disabled>
                Proceed to checkout
              </button>
            ) : (
              <Link href="/checkout" className="btn btn-primary mt-4 w-full">
                Proceed to checkout
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
