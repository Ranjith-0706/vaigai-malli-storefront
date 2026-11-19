import { formatINR } from "@/lib/format";

type Line = { key: string | number; name: string; quantity: number; total: number; image?: string };

export function OrderSummary({
  lines,
  subtotal,
  shipping,
  total,
  shippingLabel,
  note,
}: {
  lines: Line[];
  subtotal: number;
  shipping: number | null;
  total: number | null;
  shippingLabel?: string;
  note?: string;
}) {
  return (
    <section aria-label="Order summary" className="border-t-2 border-rule bg-parchment/55 p-5">
      <h2 className="text-2xl">Order summary</h2>
      <ul className="mt-4 divide-y divide-line">
        {lines.map((l) => (
          <li key={l.key} className="flex gap-3 py-3">
            {l.image && <img src={l.image} alt="" width={56} height={70} className="h-[70px] w-14 shrink-0 object-cover" />}
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{l.name}</p>
              <p className="text-muted">Qty {l.quantity}</p>
            </div>
            <p className="text-sm font-semibold">{formatINR(l.total)}</p>
          </li>
        ))}
      </ul>
      <dl className="mt-3 space-y-2 border-t border-line pt-4 text-sm">
        <div className="flex justify-between">
          <dt>Subtotal</dt>
          <dd data-testid="subtotal">{formatINR(subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Shipping{shippingLabel ? ` (${shippingLabel})` : ""}</dt>
          <dd data-testid="shipping">{shipping === null ? "Calculated at checkout" : shipping === 0 ? "Free" : formatINR(shipping)}</dd>
        </div>
        <div className="flex justify-between border-t border-line pt-3 text-lg font-semibold text-maroon-deep">
          <dt>Total</dt>
          <dd data-testid="total">{total === null ? "—" : formatINR(total)}</dd>
        </div>
      </dl>
      {note && <p className="mt-3 text-xs text-muted">{note}</p>}
    </section>
  );
}
