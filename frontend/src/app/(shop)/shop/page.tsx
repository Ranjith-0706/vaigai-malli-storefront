import type { Metadata } from "next";
import { Listing } from "@/components/Listing";
import type { SearchParams } from "@/lib/catalogQuery";

export const metadata: Metadata = {
  title: "Shop all sarees",
  description: "Browse every demo saree: Kanchipuram-style silks, soft silks and handloom cottons. Filter by fabric, colour and price.",
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing basePath="/shop" searchParams={await searchParams} eyebrow="The collection" title="All sarees" />;
}
