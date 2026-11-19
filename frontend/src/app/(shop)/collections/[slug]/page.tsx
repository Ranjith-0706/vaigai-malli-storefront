import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Listing } from "@/components/Listing";
import { serverApi } from "@/lib/api";
import type { SearchParams } from "@/lib/catalogQuery";
import type { Collection } from "@/lib/types";

async function getCollection(slug: string): Promise<Collection | undefined> {
  const all = await serverApi<Collection[]>("/collections");
  return all.find((c) => c.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await getCollection((await params).slug);
  return c ? { title: c.name, description: c.description } : { title: "Collection not found" };
}

export default async function CollectionPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  const { slug } = await params;
  const c = await getCollection(slug);
  if (!c) notFound();
  return (
    <Listing
      basePath={`/collections/${c.slug}`}
      searchParams={await searchParams}
      collectionSlug={c.slug}
      collectionName={c.name}
      eyebrow="Collection"
      title={c.name}
      intro={c.description}
      breadcrumb={
        <nav aria-label="Breadcrumb" className="mb-3 text-sm text-muted">
          <Link href="/collections" className="link">
            Collections
          </Link>{" "}
          / <span aria-current="page">{c.name}</span>
        </nav>
      }
    />
  );
}
