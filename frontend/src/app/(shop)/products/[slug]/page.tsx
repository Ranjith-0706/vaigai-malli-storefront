import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/AddToCart";
import { DemoPill } from "@/components/Brand";
import { Gallery } from "@/components/Gallery";
import { Price, ProductGrid, StockBadge } from "@/components/ProductCard";
import { ApiError, serverApi } from "@/lib/api";
import { formatINR } from "@/lib/format";
import { SITE } from "@/lib/site";
import type { ProductDetail, ShippingOption } from "@/lib/types";

async function load(slug: string): Promise<ProductDetail> {
  try {
    return await serverApi<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await serverApi<ProductDetail>(`/products/${encodeURIComponent(slug)}`);
    return {
      title: p.name,
      description: `${p.name}: ${p.fabric}, ${p.color}. ${formatINR(p.price_paise)}. Demo product.`,
      openGraph: { images: p.image_url ? [{ url: p.image_url }] : [] },
    };
  } catch {
    return { title: "Saree not found" };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [p, shipping] = await Promise.all([load(slug), serverApi<ShippingOption[]>("/shipping-options")]);
  const flat = shipping.find((s) => s.requires_address);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => new URL(i.url, SITE.url).toString()),
    color: p.color,
    material: p.fabric,
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: (p.price_paise / 100).toFixed(2),
      availability: p.in_stock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted">
        <Link href="/shop" className="link">
          Shop
        </Link>{" "}
        /{" "}
        {p.collection_slug && (
          <>
            <Link href={`/collections/${p.collection_slug}`} className="link">
              {p.collection_name}
            </Link>{" "}
            /{" "}
          </>
        )}
        <span aria-current="page">{p.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <Gallery images={p.images} inStock={p.in_stock} />

        <div className="lg:sticky lg:top-32 lg:self-start">
          <p className="eyebrow flex items-center gap-2">
            {p.category} <DemoPill />
          </p>
          <h1 className="mt-2 text-4xl sm:text-5xl">{p.name}</h1>
          <p className="mt-4 text-2xl">
            <Price paise={p.price_paise} compareAt={p.compare_at_paise} />
          </p>
          <p className="mt-1 text-xs text-muted">Inclusive of taxes (sample pricing). Shipping is shown at checkout.</p>
          <p className="mt-3" data-testid="stock-status">
            <StockBadge p={p} />
          </p>

          <dl className="mt-6 grid grid-cols-[7rem_1fr] gap-y-2 border-y border-line py-5 text-sm">
            <dt className="text-muted">Fabric</dt>
            <dd className="font-medium">{p.fabric}</dd>
            <dt className="text-muted">Colour</dt>
            <dd className="flex items-center gap-2 font-medium">
              <span aria-hidden="true" className="h-4 w-4 rounded-full border border-ink/25" style={{ background: p.color_hex }} /> {p.color}
            </dd>
            <dt className="text-muted">Length</dt>
            <dd className="font-medium">6.3 m with blouse piece (sample spec)</dd>
          </dl>

          <div className="mt-6">
            <AddToCart productId={p.id} stock={p.stock} name={p.name} />
          </div>

          <div className="mt-8 divide-y divide-line border-y border-line">
            <details className="group py-4" open>
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-maroon-deep [&::-webkit-details-marker]:hidden">
                About this saree <span className="transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <div className="mt-3 space-y-3 text-muted">
                {p.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-maroon-deep [&::-webkit-details-marker]:hidden">
                Care instructions <span className="transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-muted">{p.care}</p>
            </details>
            <details className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-maroon-deep [&::-webkit-details-marker]:hidden">
                Delivery &amp; returns <span className="transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <ul className="mt-3 space-y-2 text-muted">
                {shipping.map((s) => (
                  <li key={s.code}>
                    <strong className="text-ink">{s.label}:</strong> {s.price_paise === 0 ? "Free" : formatINR(s.price_paise)}. {s.description}
                  </li>
                ))}
                {flat?.free_above_paise && <li>Delivery is free on orders of {formatINR(flat.free_above_paise)} or more.</li>}
                <li>
                  Orders are packed by hand and dispatched manually; there is no courier integration in this demo. See{" "}
                  <Link href="/shipping" className="link">
                    shipping
                  </Link>{" "}
                  and{" "}
                  <Link href="/returns" className="link">
                    returns
                  </Link>{" "}
                  (sample policies).
                </li>
              </ul>
            </details>
          </div>
        </div>
      </div>

      {p.related.length > 0 && (
        <section className="rule mt-20 pt-10" aria-labelledby="related-h">
          <h2 id="related-h" className="mb-8 text-3xl sm:text-4xl">
            You may also like
          </h2>
          <ProductGrid items={p.related} />
        </section>
      )}
    </div>
  );
}
