"use client";

import { useState } from "react";
import { adminApi, errorMessage, useAdminData } from "@/lib/adminApi";
import type { Collection } from "@/lib/types";

type Draft = { id?: number; name: string; description: string; image_url: string; sort_order: string; is_active: boolean };
const BLANK: Draft = { name: "", description: "", image_url: "", sort_order: "0", is_active: true };

export default function AdminCollections() {
  const { data, error, reload } = useAdminData<Collection[]>("/admin/collections");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setMsg(null);
    try {
      const body = { name: draft.name.trim(), description: draft.description, image_url: draft.image_url.trim(), sort_order: Number(draft.sort_order) || 0, is_active: draft.is_active };
      if (draft.id) await adminApi(`/admin/collections/${draft.id}`, { method: "PUT", json: body });
      else await adminApi("/admin/collections", { method: "POST", json: body });
      setDraft(null);
      setMsg({ ok: true, text: "Collection saved." });
      await reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  async function toggle(c: Collection) {
    try {
      await adminApi(`/admin/collections/${c.id}/${c.is_active ? "archive" : "restore"}`, { method: "POST" });
      await reload();
    } catch (err) {
      setMsg({ ok: false, text: errorMessage(err) });
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl sm:text-5xl">Collections</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setDraft({ ...BLANK })}>+ New collection</button>
      </div>
      <div aria-live="polite" className="mt-3 min-h-6 text-sm">
        {msg && <span className={msg.ok ? "text-leaf" : "text-danger"} role={msg.ok ? "status" : "alert"}>{msg.text}</span>}
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}

      {draft && (
        <form onSubmit={save} className="mb-8 max-w-xl space-y-4 border border-line bg-ivory p-5" aria-label="Collection form">
          <h2 className="text-2xl">{draft.id ? "Edit collection" : "New collection"}</h2>
          <div>
            <label htmlFor="c-name" className="label">Name</label>
            <input id="c-name" className="field" required minLength={2} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <label htmlFor="c-desc" className="label">Description</label>
            <textarea id="c-desc" className="field" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="c-img" className="label">Cover image URL</label>
              <input id="c-img" className="field" value={draft.image_url} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} />
            </div>
            <div>
              <label htmlFor="c-sort" className="label">Sort order</label>
              <input id="c-sort" type="number" className="field" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: e.target.value })} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-maroon" checked={draft.is_active} onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })} /> Visible on the storefront</label>
          <div className="flex gap-2">
            <button className="btn btn-primary btn-sm">Save</button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="overflow-x-auto border border-line bg-ivory">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-parchment text-xs uppercase tracking-wider text-muted">
            <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Slug</th><th className="px-4 py-2.5">Order</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5" /></tr>
          </thead>
          <tbody className="divide-y divide-line">
            {data?.map((c) => (
              <tr key={c.id} className={c.is_active ? "" : "text-muted"}>
                <td className="px-4 py-2.5 font-semibold">{c.name}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{c.slug}</td>
                <td className="px-4 py-2.5">{c.sort_order}</td>
                <td className="px-4 py-2.5">{c.is_active ? "Active" : "Archived"}</td>
                <td className="space-x-4 px-4 py-2.5 text-right">
                  <button className="link" onClick={() => setDraft({ id: c.id, name: c.name, description: c.description, image_url: c.image_url, sort_order: String(c.sort_order), is_active: c.is_active })}>Edit</button>
                  <button className="link" onClick={() => toggle(c)}>{c.is_active ? "Archive" : "Restore"}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
