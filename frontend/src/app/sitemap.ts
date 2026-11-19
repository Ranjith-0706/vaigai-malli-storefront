import type { MetadataRoute } from "next";
import { serverApi } from "@/lib/api";
import { SITE } from "@/lib/site";
import type { Collection, ProductPage } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const statics = ["", "/shop", "/collections", "/about", "/contact", "/shipping", "/returns", "/privacy", "/terms", "/order-status"];
  let products: ProductPage["items"] = [];
  let collections: Collection[] = [];
  try {
    [products, collections] = await Promise.all([
      serverApi<ProductPage>("/products?page_size=48").then((p) => p.items),
      serverApi<Collection[]>("/collections"),
    ]);
  } catch {
    /* API unavailable (e.g. during a CI build): still emit the static routes */
  }
  return [
    ...statics.map((p) => ({ url: `${SITE.url}${p}` })),
    ...collections.map((c) => ({ url: `${SITE.url}/collections/${c.slug}` })),
    ...products.map((p) => ({ url: `${SITE.url}/products/${p.slug}` })),
  ];
}
