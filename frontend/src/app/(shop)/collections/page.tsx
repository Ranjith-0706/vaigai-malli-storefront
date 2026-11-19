import type { Metadata } from "next";
import Link from "next/link";
import { serverApi } from "@/lib/api";
import type { Collection } from "@/lib/types";

export const metadata: Metadata = { title: "Collections", description: "Browse the demo saree collections." };

export default async function CollectionsPage() {
  const collections = await serverApi<Collection[]>("/collections");
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-12 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-ink">Collections</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">Choose your weave</h1>
        <p className="mt-4 text-muted">From heavy bridal silks to everyday cottons. Each collection is sample data for this demo.</p>
      </header>
      <ul className="grid gap-x-8 gap-y-14 sm:grid-cols-2">
        {collections.map((c, i) => (
          <li key={c.id}>
            <Link href={`/collections/${c.slug}`} className="card group grid grid-cols-[0.8fr_1fr] items-end gap-6">
              <div className="arch border-[5px] border-line bg-parchment">
                <img src={c.image_url} alt="" width={800} height={1000} loading={i < 2 ? "eager" : "lazy"} className="card-img aspect-[4/5] w-full object-cover" />
              </div>
              <div className="pb-4">
                <h2 className="text-3xl group-hover:text-maroon sm:text-4xl">{c.name}</h2>
                <p className="mt-2 text-sm text-muted">{c.description}</p>
                <p className="mt-4 text-sm font-semibold text-maroon">{c.product_count} sarees →</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
