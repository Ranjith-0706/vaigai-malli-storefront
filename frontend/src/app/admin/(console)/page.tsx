"use client";

import Link from "next/link";
import { useAdminData } from "@/lib/adminApi";
import { formatDateTime, formatINR, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

function Stat({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const inner = (
    <div className="h-full border border-line bg-ivory p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 font-display text-4xl font-semibold text-maroon-deep" data-testid={`stat-${label.toLowerCase().replace(/\W+/g, "-")}`}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:shadow-card">
      {inner}
    </Link>
  ) : (
    inner
  );
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useAdminData<Dashboard>("/admin/dashboard");
  if (error)
    return (
      <p role="alert" className="text-danger">
        {error}{" "}
        <button className="link" onClick={reload}>
          Retry
        </button>
      </p>
    );
  if (loading || !data) return <div className="h-64 animate-pulse bg-parchment" aria-busy="true" />;

  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Dashboard</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Needs action" value={data.awaiting_action} hint="New, confirmed or packed" href="/admin/orders?status=new" />
        <Stat label="Orders (7 days)" value={data.orders_last_7_days} hint="Paid orders only" />
        <Stat label="Paid revenue" value={formatINR(data.revenue_paise)} hint="Demo money, excludes cancelled" />
        <Stat label="Sold out" value={data.out_of_stock_count} hint={`${data.active_products} active products`} href="/admin/products" />
      </div>

      <div className="mt-10 grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="by-status">
          <h2 id="by-status" className="text-2xl">
            Orders by status
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line bg-ivory">
            {Object.entries(data.orders_by_status).map(([s, n]) => (
              <li key={s}>
                <Link href={`/admin/orders?status=${s}`} className="flex justify-between px-4 py-2.5 text-sm hover:bg-parchment">
                  <span>{STATUS_LABELS[s] ?? s}</span>
                  <span className="font-semibold">{n}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="low-stock">
          <h2 id="low-stock" className="text-2xl">
            Low and sold-out stock
          </h2>
          {data.low_stock.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Everything is comfortably stocked.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line bg-ivory">
              {data.low_stock.map((p) => (
                <li key={p.id}>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-parchment">
                    <span className="truncate">{p.name}</span>
                    <span className={`shrink-0 font-semibold ${p.stock === 0 ? "text-danger" : "text-gold-ink"}`}>{p.stock === 0 ? "Sold out" : `${p.stock} left`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10" aria-labelledby="recent">
        <h2 id="recent" className="text-2xl">
          Recent orders
        </h2>
        <div className="mt-3 overflow-x-auto border border-line bg-ivory">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-parchment text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2.5">Reference</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.recent_orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5">
                    <Link href={`/admin/orders/${o.id}`} className="link font-mono">
                      {o.reference}
                    </Link>
                    <span className="block text-xs text-muted">{formatDateTime(o.created_at)}</span>
                  </td>
                  <td className="px-4 py-2.5">{o.customer_name}</td>
                  <td className="px-4 py-2.5">
                    {STATUS_LABELS[o.status] ?? o.status}
                    <span className="block text-xs text-muted">{PAYMENT_LABELS[o.payment_status]}</span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold">{formatINR(o.total_paise)}</td>
                </tr>
              ))}
              {data.recent_orders.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
