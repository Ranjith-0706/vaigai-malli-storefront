"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrderLookupForm } from "@/components/OrderLookupForm";
import { OrderSummary } from "@/components/OrderSummary";
import { api, ApiError } from "@/lib/api";
import { formatINR } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useStoredEmail } from "@/lib/useStoredEmail";

type PayResult = { success: boolean; message: string; order: Order };

export default function PaymentPage() {
  const { ref } = useParams<{ ref: string }>();
  const reference = decodeURIComponent(ref).toUpperCase();
  const router = useRouter();
  const email = useStoredEmail(reference);
  const [res, setRes] = useState<{ key: string; order?: Order; error?: string } | null>(null);
  const [busy, setBusy] = useState<null | "success" | "failure" | "cancel">(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const [attemptKey, setAttemptKey] = useState(() => crypto.randomUUID());
  const alertRef = useRef<HTMLDivElement>(null);
  const key = `${reference}|${email}`;

  useEffect(() => {
    if (!email) return;
    let alive = true;
    api<Order>("/orders/lookup", { method: "POST", json: { reference, email } })
      .then((o) => {
        if (!alive) return;
        if (o.status !== "pending_payment") router.replace(`/order/${reference}`);
        else setRes({ key, order: o });
      })
      .catch((err) => alive && setRes({ key, error: err instanceof ApiError ? err.message : "Could not load your order." }));
    return () => {
      alive = false;
    };
  }, [email, reference, key, router]);

  const order = res?.key === key ? res.order : undefined;
  const loadError = res?.key === key ? res.error : undefined;

  async function pay(outcome: "success" | "failure") {
    if (busy || !email) return;
    setBusy(outcome);
    setFailure(null);
    try {
      const r = await api<PayResult>(`/orders/${reference}/pay`, {
        method: "POST",
        json: { email, attempt_key: attemptKey, demo_outcome: outcome },
      });
      if (r.success) {
        router.push(`/order/${reference}`);
        return;
      }
      setFailure(r.message);
      setAttemptKey(crypto.randomUUID()); // a retry is a new attempt
      requestAnimationFrame(() => alertRef.current?.focus());
    } catch (err) {
      if (err instanceof ApiError && (err.code === "reservation_expired" || err.code === "order_cancelled")) setFatal(err.message);
      else setFailure(err instanceof ApiError ? err.message : "We could not reach the server. You have not been charged. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    if (busy || !email) return;
    setBusy("cancel");
    try {
      await api(`/orders/${reference}/cancel`, { method: "POST", json: { email } });
      setFatal("Your order was cancelled and the items were released. Nothing was charged.");
    } catch (err) {
      setFailure(err instanceof ApiError ? err.message : "Could not cancel right now.");
    } finally {
      setBusy(null);
    }
  }

  if (email === "") {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-4xl">Continue to payment</h1>
        <p className="mb-6 mt-3 text-muted">Enter your email to continue paying for order {reference}.</p>
        <OrderLookupForm initialRef={reference} />
      </div>
    );
  }

  if (fatal) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
        <h1 className="text-4xl">This order is closed</h1>
        <p className="mt-4 text-muted">{fatal}</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (loadError)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center" role="alert">
        <p className="text-danger">{loadError}</p>
        <Link href="/order-status" className="btn btn-outline mt-6">
          Track an order
        </Link>
      </div>
    );

  if (!order)
    return (
      <div className="mx-auto max-w-3xl px-4 py-24" aria-busy="true">
        <div className="h-48 animate-pulse bg-parchment" />
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="text-5xl sm:text-6xl">Payment</h1>
      <p className="mt-2 text-muted">
        Order <span className="font-mono font-semibold text-maroon-deep">{order.reference}</span>. Items are reserved until {order.reservation_expires_at ? new Date(order.reservation_expires_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "payment"}.
      </p>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <section aria-labelledby="demo-pay" className="border-[1.5px] border-gold bg-parchment/60 p-6 sm:p-8">
          <p className="inline-block bg-maroon px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-wider text-ivory">Demo payment · no money moves</p>
          <h2 id="demo-pay" className="mt-4 text-3xl">
            Simulated payment of {formatINR(order.total_paise)}
          </h2>
          <p className="mt-2 text-sm text-muted">
            This stands in for a real payment gateway. Choose an outcome to test the flow. No card or UPI details are requested or stored.
          </p>

          <div ref={alertRef} tabIndex={-1} className="outline-none" aria-live="assertive">
            {failure && (
              <div role="alert" className="mt-6 border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" data-testid="payment-failure">
                <strong>Payment failed.</strong> {failure} Your items are still reserved, and you have not been charged. You can try again.
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button type="button" className="btn btn-leaf flex-1" onClick={() => pay("success")} disabled={busy !== null} data-testid="pay-success">
              {busy === "success" ? "Processing…" : failure ? "Try again (demo success)" : `Complete demo payment · ${formatINR(order.total_paise)}`}
            </button>
            <button type="button" className="btn btn-outline flex-1" onClick={() => pay("failure")} disabled={busy !== null} data-testid="pay-failure">
              {busy === "failure" ? "Processing…" : "Simulate a failed payment"}
            </button>
          </div>
          <button type="button" className="link mt-6 text-sm" onClick={cancel} disabled={busy !== null}>
            Cancel this order and release the items
          </button>
        </section>

        <OrderSummary
          lines={order.items.map((i) => ({ key: i.product_id, name: i.product_name, quantity: i.quantity, total: i.unit_price_paise * i.quantity }))}
          subtotal={order.subtotal_paise}
          shipping={order.shipping_paise}
          total={order.total_paise}
          shippingLabel={order.shipping_method_label}
        />
      </div>
    </div>
  );
}
