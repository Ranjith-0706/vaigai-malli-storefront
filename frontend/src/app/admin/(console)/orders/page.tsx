"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { useAdminData } from "@/lib/adminApi";
import { formatDateTime, formatINR, PAYMENT_LABELS, STATUS_LABELS } from "@/lib/format";
import type { OrderListItem } from "@/lib/types";

type Page = { items: OrderListItem[]; total: number; page: number; page_size: number };
const TABS = ["", "new", "confirmed", "packed", "shipped", "delivered", "cancelled", "pending_payment"];

function Orders() {
  const sp = useSearchParams();
  const router = useRouter();
  const status = sp.get("status") ?? "";
  const q = sp.get("q") ?? "";
  const page = Number(sp.get("page") ?? "1") || 1;
  const [search, setSearch] = useState(q);
  const qs = new URLSearchParams({ page: String(page), ...(status ? { status } : {}), ...(q ? { q } : {}) });
  const { data, error, loading } = useAdminData<Page>(`/admin/orders?${qs}`);

  function go(next: Record<string, string>) {
    const p = new URLSearchParams();
    const merged = { status, q, ...next };
    Object.entries(merged).forEach(([k, v]) => v && p.set(k, v));
    router.push(`/admin/orders${p.size ? `?${p}` : ""}`);
  }

  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Orders</h1>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {TABS.map((t) => (
            <button key={t || "all"} role="tab" aria-selected={status === t} onClick={() => go({ status: t, page: "" })} className={`px-3 py-1.5 text-sm font-semibold ${status === t ? "bg-maroon text-ivory" : "border border-line bg-ivory text-ink hover:border-maroon"}`}>
              {t ? STATUS_LABELS[t] : "All paid"}
            </button>
          ))}
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: search.trim(), page: "" });
          }}
          className="flex gap-2"
        >
          <label htmlFor="order-search" className="sr-only">
            Search orders by reference, name or email
          </label>
          <input id="order-search" className="field w-64" type="search" placeholder="Reference, name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
      </div>

      {error && (
        <p role="alert" className="mt-6 text-danger">
          {error}
        </p>
      )}
      <div className="mt-6 overflow-x-auto border border-line bg-ivory" aria-busy={loading}>
        <table className="w-full min-w-[40rem] text-left text-sm">
          <thead className="bg-parchment text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5">Reference</th>
              <th className="px-4 py-2.5">Customer</th>
              <th className="px-4 py-2.5">Items</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.items.map((o) => (
              <tr key={o.id} data-testid="order-row">
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${o.id}`} className="link font-mono">
                    {o.reference}
                  </Link>
                  <span className="block text-xs text-muted">{formatDateTime(o.created_at)}</span>
                </td>
                <td className="px-4 py-3">
                  {o.customer_name}
                  <span className="block text-xs text-muted">{o.email}</span>
                </td>
                <td className="px-4 py-3">{o.item_count}</td>
                <td className="px-4 py-3">
                  <span className="font-semibold">{STATUS_LABELS[o.status] ?? o.status}</span>
                  <span className="block text-xs text-muted">{PAYMENT_LABELS[o.payment_status]}</span>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{formatINR(o.total_paise)}</td>
              </tr>
            ))}
            {data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted">
                  No orders match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {data && data.total > data.page_size && (
        <nav aria-label="Pagination" className="mt-6 flex items-center gap-3 text-sm">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}>
            ← Prev
          </button>
          <span>
            Page {page} of {Math.ceil(data.total / data.page_size)}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page * data.page_size >= data.total} onClick={() => go({ page: String(page + 1) })}>
            Next →
          </button>
        </nav>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse bg-parchment" />}>
      <Orders />
    </Suspense>
  );
}
