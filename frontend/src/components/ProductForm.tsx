"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { adminApi, errorMessage, useAdminData } from "@/lib/adminApi";
import { rupeesToPaise } from "@/lib/format";
import type { AdminProduct, Collection } from "@/lib/types";

type Img = { url: string; alt: string };

const CATEGORIES = ["Kanchipuram Silk", "Soft Silk", "Silk Cotton", "Handloom Cotton"];

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const { data: collections } = useAdminData<Collection[]>("/admin/collections");
  const [f, setF] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    category: product?.category ?? CATEGORIES[0],
    fabric: product?.fabric ?? "",
    color: product?.color ?? "",
    color_hex: product?.color_hex ?? "#7a1424",
    price: product ? String(product.price_paise / 100) : "",
    compare: product?.compare_at_paise ? String(product.compare_at_paise / 100) : "",
    stock: product ? String(product.stock) : "1",
    collection_id: product?.collection_id ? String(product.collection_id) : "",
    featured: product?.featured ?? false,
    description: product?.description ?? "",
    care: product?.care ?? "",
  });
  const [images, setImages] = useState<Img[]>(product?.images.map((i) => ({ url: i.url, alt: i.alt })) ?? []);
  const [newUrl, setNewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof typeof f, v: string | boolean) => setF((s) => ({ ...s, [k]: v }));

  async function upload(file: File) {
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await adminApi<{ url: string }>("/admin/uploads", { method: "POST", body: fd });
      setImages((im) => [...im, { url: r.url, alt: f.name }]);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const price = rupeesToPaise(f.price);
    const compare = f.compare ? rupeesToPaise(f.compare) : null;
    const stock = Number(f.stock);
    if (price === null || price <= 0) return setError("Enter a price greater than zero (in rupees).");
    if (!Number.isInteger(stock) || stock < 0) return setError("Stock must be a whole number, 0 or more.");
    if (f.compare && (compare === null || compare <= price)) return setError("Compare-at price must be higher than the price.");
    setBusy(true);
    try {
      const body = {
        name: f.name.trim(),
        slug: f.slug.trim() || undefined,
        description: f.description,
        category: f.category.trim(),
        fabric: f.fabric.trim(),
        color: f.color.trim(),
        color_hex: f.color_hex,
        price_paise: price,
        compare_at_paise: compare,
        stock,
        care: f.care,
        featured: f.featured,
        collection_id: f.collection_id ? Number(f.collection_id) : null,
        images,
      };
      if (product) {
        await adminApi(`/admin/products/${product.id}`, { method: "PUT", json: body });
        setSaved(true);
      } else {
        await adminApi("/admin/products", { method: "POST", json: body });
        router.push("/admin/products");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-6 max-w-4xl space-y-8" aria-label="Product details">
      <div aria-live="polite">
        {error && (
          <p role="alert" className="border border-danger bg-danger-soft px-4 py-2.5 text-sm text-danger" data-testid="product-error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="border border-leaf bg-leaf-soft px-4 py-2.5 text-sm text-leaf-deep" data-testid="product-saved">
            Saved. Changes are live on the storefront.
          </p>
        )}
      </div>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-display text-2xl font-semibold">Basics</legend>
        <div className="sm:col-span-2">
          <label htmlFor="p-name" className="label">Name</label>
          <input id="p-name" className="field" required minLength={2} value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-cat" className="label">Category</label>
          <input id="p-cat" className="field" list="cats" required value={f.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label htmlFor="p-fab" className="label">Fabric</label>
          <input id="p-fab" className="field" required value={f.fabric} onChange={(e) => set("fabric", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-col" className="label">Colour name</label>
          <input id="p-col" className="field" required value={f.color} onChange={(e) => set("color", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-hex" className="label">Colour swatch</label>
          <input id="p-hex" type="color" className="field !p-1" value={f.color_hex} onChange={(e) => set("color_hex", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-coll" className="label">Collection</label>
          <select id="p-coll" className="field" value={f.collection_id} onChange={(e) => set("collection_id", e.target.value)}>
            <option value="">None</option>
            {collections?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.is_active ? "" : " (archived)"}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="p-slug" className="label">URL slug (optional)</label>
          <input id="p-slug" className="field" pattern="[a-z0-9]+(-[a-z0-9]+)*" value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="auto from name" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="mb-2 font-display text-2xl font-semibold">Price &amp; stock</legend>
        <div>
          <label htmlFor="p-price" className="label">Price (₹)</label>
          <input id="p-price" className="field" inputMode="decimal" required value={f.price} onChange={(e) => set("price", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-cmp" className="label">Compare-at (₹, optional)</label>
          <input id="p-cmp" className="field" inputMode="decimal" value={f.compare} onChange={(e) => set("compare", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-stock" className="label">Stock on hand</label>
          <input id="p-stock" className="field" type="number" min={0} required value={f.stock} onChange={(e) => set("stock", e.target.value)} />
          <p className="hint mt-1">Units reserved by unpaid orders are already deducted.</p>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-3">
          <input type="checkbox" className="h-4 w-4 accent-maroon" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Feature on the home page
        </label>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-display text-2xl font-semibold">Description &amp; care</legend>
        <div>
          <label htmlFor="p-desc" className="label">Description</label>
          <textarea id="p-desc" className="field" value={f.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div>
          <label htmlFor="p-care" className="label">Care instructions</label>
          <textarea id="p-care" className="field" value={f.care} onChange={(e) => set("care", e.target.value)} />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 font-display text-2xl font-semibold">Images</legend>
        <p className="hint mb-3">The first image is the main image. Use an image URL, or upload PNG/JPEG/WebP/GIF (max 4 MB). Only upload photos you own or have licensed.</p>
        <ul className="space-y-3">
          {images.map((im, i) => (
            <li key={`${im.url}-${i}`} className="flex flex-wrap items-center gap-3 border border-line bg-ivory p-3">
              <img src={im.url} alt="" width={48} height={60} className="h-[60px] w-12 object-cover" />
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate text-xs text-muted">{im.url}</p>
                <label className="sr-only" htmlFor={`alt-${i}`}>Alt text for image {i + 1}</label>
                <input id={`alt-${i}`} className="field mt-1" placeholder="Alt text (describe the image)" value={im.alt} onChange={(e) => setImages((a) => a.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} />
              </div>
              <div className="flex gap-1">
                <button type="button" className="btn btn-outline btn-sm" disabled={i === 0} onClick={() => setImages((a) => { const c = [...a]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; return c; })} aria-label={`Move image ${i + 1} up`}>↑</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setImages((a) => a.filter((_, j) => j !== i))} aria-label={`Remove image ${i + 1}`}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap gap-2">
          <label htmlFor="img-url" className="sr-only">Image URL</label>
          <input id="img-url" className="field max-w-sm" placeholder="https://… or /products/…" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { if (newUrl.trim()) { setImages((a) => [...a, { url: newUrl.trim(), alt: f.name }]); setNewUrl(""); } }}>Add URL</button>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" aria-label="Upload an image file" onChange={(e) => { const file = e.target.files?.[0]; if (file) void upload(file); e.target.value = ""; }} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current?.click()}>Upload file…</button>
        </div>
      </fieldset>

      <div className="flex gap-3 border-t border-line pt-6">
        <button className="btn btn-primary" disabled={busy} data-testid="save-product">{busy ? "Saving…" : product ? "Save changes" : "Create product"}</button>
        <button type="button" className="btn btn-outline" onClick={() => router.push("/admin/products")}>Back to list</button>
      </div>
    </form>
  );
}
