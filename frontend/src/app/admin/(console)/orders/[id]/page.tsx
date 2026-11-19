"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { adminApi, errorMessage, useAdminData } from "@/lib/adminApi";
import { formatDateTime, formatINR, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { AdminOrder } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  confirmed: "Confirm order",
  packed: "Mark as packed",
  shipped: "Mark as shipped",
  delivered: "Mark as delivered",
  cancelled: "Cancel order",
};

export default function AdminOrderPage() {
  const { id } = useParams<{ id: string }>();
  const { data: order, error, loading, setData } = useAdminData<AdminOrder>(`/admin/orders/${id}`);
  const [tracking, setTracking] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (loading || !order) return <div className="h-64 animate-pulse bg-parchment" aria-busy="true" />;

  const trackingValue = tracking ?? order.tracking_reference;
  const notesValue = notes ?? order.fulfilment_notes;
  const isPickup = !order.address_line1;

  async function move(to: string) {
    if (!order) return;
    if (to === "cancelled" && !window.confirm("Cancel this order? Reserved stock will be returned to inventory.")) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await adminApi<AdminOrder>(`/admin/orders/${order.id}/transition`, {
        method: "POST",
        json: { to_status: to, tracking_reference: trackingValue || undefined, note: note || undefined },
      });
      setData(updated);
      setNote("");
      setTracking(null);
      setMsg({ ok: true, text: `Order is now ${STATUS_LABELS[updated.status]}.` });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  async function saveNotes() {
    if (!order) return;
    setBusy(true);
    setMsg(null);
    try {
      const updated = await adminApi<AdminOrder>(`/admin/orders/${order.id}`, {
        method: "PATCH",
        json: { fulfilment_notes: notesValue, tracking_reference: trackingValue },
      });
      setData(updated);
      setNotes(null);
      setTracking(null);
      setMsg({ ok: true, text: "Fulfilment details saved." });
    } catch (e) {
      setMsg({ ok: false, text: errorMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Link href="/admin/orders" className="link text-sm">
        ← All orders
      </Link>
      <div className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="font-mono text-3xl sm:text-4xl">{order.reference}</h1>
        <span className="bg-maroon px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-ivory" data-testid="admin-order-status">
          {STATUS_LABELS[order.status]}
        </span>
        <span className="text-sm text-muted">{PAYMENT_LABELS[order.payment_status]}</span>
      </div>
      <p className="text-sm text-muted">Placed {formatDateTime(order.created_at)}</p>

      <div aria-live="polite" className="mt-4">
        {msg && (
          <p role={msg.ok ? "status" : "alert"} data-testid="admin-msg" className={`border px-4 py-2.5 text-sm ${msg.ok ? "border-leaf bg-leaf-soft text-leaf-deep" : "border-danger bg-danger-soft text-danger"}`}>
            {msg.text}
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-8">
          <section className="border border-line bg-ivory p-5" aria-labelledby="fulfil">
            <h2 id="fulfil" className="text-2xl">
              Fulfilment
            </h2>
            {order.allowed_transitions.length === 0 ? (
              <p className="mt-3 text-sm text-muted">This order is {STATUS_LABELS[order.status].toLowerCase()}; no further status changes are possible.</p>
            ) : (
              <>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="tracking" className="label">
                      Tracking reference {isPickup ? "(not needed for pickup)" : "(required to ship)"}
                    </label>
                    <input id="tracking" className="field" value={trackingValue} onChange={(e) => setTracking(e.target.value)} placeholder="Courier name + number" />
                  </div>
                  <div>
                    <label htmlFor="note" className="label">
                      Note for the history (optional)
                    </label>
                    <input id="note" className="field" value={note} onChange={(e) => setNote(e.target.value)} />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {order.allowed_transitions.map((t) => (
                    <button key={t} disabled={busy} onClick={() => move(t)} className={`btn btn-sm ${t === "cancelled" ? "btn-outline !border-danger !text-danger hover:!bg-danger hover:!text-white" : "btn-primary"}`} data-testid={`transition-${t}`}>
                      {ACTION_LABEL[t] ?? t}
                    </button>
                  ))}
                </div>
              </>
            )}
            <div className="mt-6 border-t border-line pt-4">
              <label htmlFor="fnotes" className="label">
                Internal fulfilment notes
              </label>
              <textarea id="fnotes" className="field" value={notesValue} onChange={(e) => setNotes(e.target.value)} maxLength={4000} />
              <button className="btn btn-outline btn-sm mt-2" disabled={busy} onClick={saveNotes}>
                Save notes &amp; tracking
              </button>
            </div>
          </section>

          <section aria-labelledby="items">
            <h2 id="items" className="text-2xl">
              Items
            </h2>
            <ul className="mt-3 divide-y divide-line border-y border-line bg-ivory">
              {order.items.map((i) => (
                <li key={i.product_id} className="flex justify-between px-4 py-2.5 text-sm">
                  <span>
                    {i.product_name} × {i.quantity}
                  </span>
                  <span className="font-semibold">{formatINR(i.unit_price_paise * i.quantity)}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2 text-sm text-muted">
                <span>Shipping ({order.shipping_method_label})</span>
                <span>{formatINR(order.shipping_paise)}</span>
              </li>
              <li className="flex justify-between px-4 py-2.5 font-semibold text-maroon-deep">
                <span>Total</span>
                <span>{formatINR(order.total_paise)}</span>
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-8">
          <section aria-labelledby="cust">
            <h2 id="cust" className="text-2xl">
              Customer
            </h2>
            <address className="mt-3 border border-line bg-ivory p-4 text-sm not-italic">
              <strong>{order.customer_name}</strong>
              <br />
              {order.email}
              <br />
              {order.phone}
              <br />
              <span className="mt-2 block text-muted">
                {isPickup ? (
                  "Local pickup"
                ) : (
                  <>
                    {order.address_line1}
                    {order.address_line2 && `, ${order.address_line2}`}
                    <br />
                    {order.city}, {order.state} {order.pincode}
                  </>
                )}
              </span>
            </address>
          </section>

          <section aria-labelledby="pay">
            <h2 id="pay" className="text-2xl">
              Payment attempts
            </h2>
            <ul className="mt-3 divide-y divide-line border-y border-line bg-ivory text-sm">
              {order.payments.length === 0 && <li className="px-4 py-2.5 text-muted">No attempts yet.</li>}
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between px-4 py-2.5">
                  <span>
                    {p.provider} · {p.status}
                    {p.failure_reason && <span className="block text-xs text-danger">{p.failure_reason}</span>}
                  </span>
                  <span className="text-muted">{formatDateTime(p.created_at)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="hist">
            <h2 id="hist" className="text-2xl">
              History
            </h2>
            <ol className="mt-3 space-y-3 border-l-2 border-gold pl-4 text-sm">
              {[...order.events].reverse().map((e) => (
                <li key={e.id}>
                  <p className="font-semibold">
                    {e.to_status ? STATUS_LABELS[e.to_status] : e.kind === "note" ? "Note" : "Payment"}
                    <span className="ml-2 font-normal text-muted">{formatDateTime(e.created_at)}</span>
                  </p>
                  {e.note && <p className="text-muted">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
