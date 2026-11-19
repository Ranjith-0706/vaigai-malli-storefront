import Link from "next/link";
import { formatDateTime, formatINR, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { Order } from "@/lib/types";

const STEPS = ["new", "confirmed", "packed", "shipped", "delivered"];

export function StatusTracker({ order }: { order: Order }) {
  if (order.status === "cancelled") {
    return (
      <p className="border border-danger bg-danger-soft px-4 py-3 text-sm font-semibold text-danger" data-testid="order-status">
        Cancelled{order.payment_status === "refund_due" ? ". A refund is due; the shop will arrange it manually (demo)." : ""}
      </p>
    );
  }
  if (order.status === "pending_payment") {
    return (
      <p className="border border-gold bg-parchment px-4 py-3 text-sm font-semibold" data-testid="order-status">
        Awaiting payment.{" "}
        <Link href={`/checkout/payment/${order.reference}`} className="link">
          Complete payment
        </Link>
      </p>
    );
  }
  const idx = STEPS.indexOf(order.status);
  const at = (s: string) => order.timeline?.find((t) => t.status === s)?.at;
  return (
    <div>
      <p className="sr-only" data-testid="order-status">
        {STATUS_LABELS[order.status]}
      </p>
      <ol className="grid grid-cols-5 gap-1 text-center" aria-label="Order progress">
        {STEPS.map((s, i) => (
          <li key={s} aria-current={i === idx ? "step" : undefined} className="relative">
            <div className={`mx-auto grid h-9 w-9 place-items-center rounded-full border-2 text-sm font-bold ${i <= idx ? "border-leaf bg-leaf text-white" : "border-line bg-ivory text-muted"}`}>{i < idx ? "✓" : i + 1}</div>
            <p className={`mt-2 text-xs sm:text-sm ${i === idx ? "font-semibold text-maroon-deep" : "text-muted"}`}>{STATUS_LABELS[s]}</p>
            {at(s) && <p className="hidden text-[0.7rem] text-muted sm:block">{formatDateTime(at(s)!)}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function OrderDetails({ order }: { order: Order }) {
  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section aria-label="Items">
        <h2 className="text-2xl">Items</h2>
        <ul className="mt-3 divide-y divide-line border-y border-line">
          {order.items.map((i) => (
            <li key={i.product_id} className="flex justify-between gap-4 py-3 text-sm">
              <span>
                {i.product_name} <span className="text-muted">× {i.quantity}</span>
              </span>
              <span className="font-semibold">{formatINR(i.unit_price_paise * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatINR(order.subtotal_paise)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Shipping ({order.shipping_method_label})</dt>
            <dd>{order.shipping_paise === 0 ? "Free" : formatINR(order.shipping_paise)}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-lg font-semibold text-maroon-deep">
            <dt>Total</dt>
            <dd data-testid="order-total">{formatINR(order.total_paise)}</dd>
          </div>
        </dl>
      </section>
      <section aria-label="Delivery and payment" className="space-y-5 text-sm">
        <div>
          <h2 className="text-2xl">{order.address_line1 ? "Delivering to" : "Local pickup"}</h2>
          <address className="mt-2 not-italic text-muted">
            {order.customer_name}
            <br />
            {order.address_line1 ? (
              <>
                {order.address_line1}
                <br />
                {order.address_line2 && (
                  <>
                    {order.address_line2}
                    <br />
                  </>
                )}
                {order.city}, {order.state} {order.pincode}
              </>
            ) : (
              "Collect from the demo shop once your order is ready."
            )}
          </address>
        </div>
        <div>
          <h2 className="text-2xl">Payment</h2>
          <p className="mt-2 text-muted">
            {PAYMENT_LABELS[order.payment_status] ?? order.payment_status}
            {order.payment_mode === "demo" && " · simulated, no money charged"}
          </p>
        </div>
        {order.tracking_reference && (
          <div>
            <h2 className="text-2xl">Tracking reference</h2>
            <p className="mt-2 font-mono text-muted" data-testid="tracking">
              {order.tracking_reference}
            </p>
            <p className="hint">Entered by the shop. There is no live courier tracking in this demo.</p>
          </div>
        )}
      </section>
    </div>
  );
}
