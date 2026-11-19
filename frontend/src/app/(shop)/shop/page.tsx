import type { Metadata } from "next";
import { Listing } from "@/components/Listing";
import type { SearchParams } from "@/lib/catalogQuery";

export const metadata: Metadata = {
  title: "Shop all sarees",
  description: "Browse every demo saree: Kanchipuram-style silks, soft silks and handloom cottons. Filter by fabric, colour and price.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <header className="mb-10 border-b border-line pb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-ink">The collection</p>
        <h1 className="mt-2 text-5xl sm:text-6xl">All sarees</h1>
      </header>
      <Listing basePath="/shop" searchParams={sp} />
    </div>
  );
}
