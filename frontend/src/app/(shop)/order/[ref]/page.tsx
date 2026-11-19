"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderDetails, StatusTracker } from "@/components/OrderView";
import { OrderLookupForm } from "@/components/OrderLookupForm";
import { api, ApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Order } from "@/lib/types";
import { useStoredEmail } from "@/lib/useStoredEmail";

type Result = { key: string; order?: Order; error?: string };

export default function OrderPage() {
  const { ref } = useParams<{ ref: string }>();
  const reference = decodeURIComponent(ref).toUpperCase();
  const email = useStoredEmail(reference);
  const [res, setRes] = useState<Result | null>(null);
  const key = `${reference}|${email}`;

  useEffect(() => {
    if (!email) return;
    let alive = true;
    api<Order>("/orders/lookup", { method: "POST", json: { reference, email } })
      .then((order) => alive && setRes({ key, order }))
      .catch((e) => alive && setRes({ key, error: e instanceof ApiError ? e.message : "We could not load this order. Please try again." }));
    return () => {
      alive = false;
    };
  }, [email, reference, key]);

  const loading = email === null || (email !== "" && res?.key !== key);
  const order = res?.key === key ? res.order : undefined;
  const error = res?.key === key ? res.error : undefined;

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-24" aria-busy="true">
        <div className="h-10 w-2/3 animate-pulse bg-parchment" />
        <div className="mt-6 h-40 animate-pulse bg-parchment" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="text-4xl">Find order {reference}</h1>
        <p className="mb-6 mt-3 text-muted">For your privacy, enter the email used at checkout to view this order.</p>
        <OrderLookupForm initialRef={reference} error={error} />
      </div>
    );
  }

  const paid = order.payment_status === "paid" || order.payment_status === "refund_due";
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="border-b border-line pb-8">
        {paid && order.status === "new" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-leaf">Thank you, {order.customer_name.split(" ")[0]}</p>
            <h1 className="mt-2 text-5xl sm:text-6xl" data-testid="confirmation-heading">
              Order confirmed
            </h1>
          </>
        ) : (
          <h1 className="text-5xl sm:text-6xl">Your order</h1>
        )}
        <p className="mt-4 text-lg">
          Reference{" "}
          <strong className="font-mono text-maroon-deep" data-testid="order-reference">
            {order.reference}
          </strong>
        </p>
        <p className="text-sm text-muted">Placed {formatDateTime(order.created_at)}. Keep this reference and your email to check status later.</p>
        {order.payment_mode === "demo" && paid && (
          <p className="mt-4 inline-block border border-gold/60 bg-parchment px-3 py-2 text-sm">
            <strong>Demo order.</strong> Payment was simulated and no money was charged. Nothing will be shipped.
          </p>
        )}
      </header>

      <div className="py-8">
        <StatusTracker order={order} />
      </div>
      <OrderDetails order={order} />

      <div className="mt-12 flex flex-wrap gap-3 no-print">
        <Link href="/shop" className="btn btn-primary">
          Continue shopping
        </Link>
        <button type="button" className="btn btn-outline" onClick={() => window.print()}>
          Print
        </button>
      </div>
    </div>
  );
}
