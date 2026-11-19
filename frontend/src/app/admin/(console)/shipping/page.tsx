"use client";

import { useState } from "react";
import { adminApi, errorMessage, useAdminData } from "@/lib/adminApi";
import { rupeesToPaise } from "@/lib/format";
import type { ShippingOption } from "@/lib/types";

type Method = ShippingOption & { id: number; is_active: boolean };

function MethodCard({ m, onSaved }: { m: Method; onSaved: () => void }) {
  const [label, setLabel] = useState(m.label);
  const [desc, setDesc] = useState(m.description);
  const [price, setPrice] = useState(String(m.price_paise / 100));
  const [free, setFree] = useState(m.free_above_paise ? String(m.free_above_paise / 100) : "");
  const [active, setActive] = useState(m.is_active);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const p = rupeesToPaise(price);
    const f = free ? rupeesToPaise(free) : null;
    if (p === null) return setMsg({ ok: false, text: "Enter a valid price (₹0 or more)." });
    if (free && f === null) return setMsg({ ok: false, text: "Enter a valid free-shipping threshold." });
    try {
      await adminApi(`/admin/shipping-methods/${m.id}`, { method: "PUT", json: { label, description: desc, price_paise: p, free_above_paise: f, is_active: active } });
      setMsg({ ok: true, text: "Saved." });
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 border border-line bg-ivory p-5" aria-label={`${m.label} settings`}>
      <h2 className="text-2xl">
        {m.label} <span className="font-mono text-xs text-muted">({m.code})</span>
      </h2>
      <div>
        <label htmlFor={`l-${m.id}`} className="label">Label shown to customers</label>
        <input id={`l-${m.id}`} className="field" value={label} onChange={(e) => setLabel(e.target.value)} required />
      </div>
      <div>
        <label htmlFor={`d-${m.id}`} className="label">Description</label>
        <input id={`d-${m.id}`} className="field" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`p-${m.id}`} className="label">Price (₹)</label>
          <input id={`p-${m.id}`} className="field" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div>
          <label htmlFor={`f-${m.id}`} className="label">Free above (₹, optional)</label>
          <input id={`f-${m.id}`} className="field" inputMode="decimal" value={free} onChange={(e) => setFree(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={active} onChange={(e) => setActive(e.target.checked)} /> Offered at checkout</label>
      <div className="flex items-center gap-3">
        <button className="btn btn-primary btn-sm">Save</button>
        <span aria-live="polite" className={`text-sm ${msg?.ok ? "text-leaf" : "text-danger"}`}>{msg?.text}</span>
      </div>
    </form>
  );
}

export default function AdminShipping() {
  const { data, error, reload } = useAdminData<Method[]>("/admin/shipping-methods");
  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Shipping</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">Rates are applied server-side at checkout. Orders are fulfilled manually; there is no courier integration.</p>
      {error && <p role="alert" className="mt-4 text-danger">{error}</p>}
      <div className="mt-6 grid max-w-3xl gap-6">{data?.map((m) => <MethodCard key={m.id} m={m} onSaved={reload} />)}</div>
    </div>
  );
}
