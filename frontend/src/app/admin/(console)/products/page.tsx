"use client";

import Link from "next/link";
import { useState } from "react";
import { adminApi, errorMessage, useAdminData } from "@/lib/adminApi";
import { formatINR } from "@/lib/format";
import type { AdminProduct } from "@/lib/types";

export default function AdminProducts() {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [applied, setApplied] = useState("");
  const { data, error, loading, reload } = useAdminData<AdminProduct[]>(`/admin/products?status=${status}${applied ? `&q=${encodeURIComponent(applied)}` : ""}`);
  const [msg, setMsg] = useState<string | null>(null);

  async function toggle(p: AdminProduct) {
    setMsg(null);
    try {
      await adminApi(`/admin/products/${p.id}/${p.is_active ? "archive" : "restore"}`, { method: "POST" });
      await reload();
      setMsg(`${p.name} ${p.is_active ? "archived (hidden from the shop)" : "restored"}.`);
    } catch (e) {
      setMsg(errorMessage(e));
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Products</h1>
        <Link href="/admin/products/new" className="btn btn-primary btn-sm">
          + New product
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setApplied(q.trim());
          }}
        >
          <label htmlFor="psearch" className="sr-only">
            Search products
          </label>
          <input id="psearch" type="search" className="field w-60" placeholder="Search name or category" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline btn-sm">Search</button>
        </form>
        <div>
          <label htmlFor="pstatus" className="sr-only">
            Status filter
          </label>
          <select id="pstatus" className="field" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm text-leaf">
        {msg}
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="mt-2 overflow-x-auto border border-line bg-ivory" aria-busy={loading}>
        <table className="w-full min-w-[44rem] text-left text-sm">
          <thead className="bg-parchment text-xs uppercase tracking-wider text-muted">
            <tr>
              <th className="px-4 py-2.5">Product</th>
              <th className="px-4 py-2.5">Category</th>
              <th className="px-4 py-2.5 text-right">Price</th>
              <th className="px-4 py-2.5 text-right">Stock</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.map((p) => (
              <tr key={p.id} className={p.is_active ? "" : "bg-parchment/60 text-muted"}>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    {p.image_url && <img src={p.image_url} alt="" width={36} height={45} className="h-[45px] w-9 object-cover" />}
                    <Link href={`/admin/products/${p.id}`} className="link font-semibold">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-2.5">{p.category}</td>
                <td className="px-4 py-2.5 text-right">{formatINR(p.price_paise)}</td>
                <td className={`px-4 py-2.5 text-right font-semibold ${p.stock === 0 ? "text-danger" : p.low_stock ? "text-gold-ink" : ""}`}>{p.stock}</td>
                <td className="px-4 py-2.5">{p.is_active ? "Active" : "Archived"}</td>
                <td className="px-4 py-2.5 text-right">
                  <button className="link" onClick={() => toggle(p)} aria-label={`${p.is_active ? "Archive" : "Restore"} ${p.name}`}>
                    {p.is_active ? "Archive" : "Restore"}
                  </button>
                </td>
              </tr>
            ))}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
