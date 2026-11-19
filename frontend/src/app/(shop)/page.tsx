import Link from "next/link";
import { Garland, Jasmine, OrnamentDivider } from "@/components/Brand";
import { ProductGrid } from "@/components/ProductCard";
import { serverApi } from "@/lib/api";
import type { Collection, ProductPage } from "@/lib/types";

const CRAFT_STEPS = [
  {
    n: "01",
    title: "Silk and zari thread",
    body: "Mulberry silk is twisted and dyed; fine silver thread is coated with gold to make zari. In this demo, the colours were chosen from temple walls, kumkum and leaf.",
  },
  {
    n: "02",
    title: "Korvai border",
    body: "On many Kanchipuram-style sarees the border is woven separately and interlocked with the body, which is why a contrast border can be so crisp.",
  },
  {
    n: "03",
    title: "Pallu and finishing",
    body: "The pallu carries the heaviest motifs: lamps, coins, peacocks. A last careful fold and a muslin wrap, ready to be draped.",
  },
];

export default async function Home() {
  const [featured, collections] = await Promise.all([
    serverApi<ProductPage>("/products?featured=true&page_size=8"),
    serverApi<Collection[]>("/collections"),
  ]);
  const hero = featured.items.find((p) => p.slug === "meenakshi-maroon-kanchipuram") ?? featured.items[0];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-parchment weave-bg">
        <div className="pointer-events-none absolute inset-x-0 top-0 mx-auto max-w-5xl" aria-hidden="true">
          <Garland className="garland-sway w-full" width={900} />
        </div>
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-24 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pb-24 lg:pt-28">
          <div>
            <p className="rise inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-gold-ink">
              <Jasmine size={18} /> Temple-border silk · Illustrated demo
            </p>
            <h1 className="rise d1 mt-4 text-[clamp(2.7rem,7vw,5.2rem)] text-balance">
              Temple-border silks, <em className="font-medium text-maroon">strung like jasmine.</em>
            </h1>
            <p className="rise d2 mt-6 max-w-xl text-lg text-muted">
              Wedding silks with woven zari, soft silks for the week, and handloom cottons for the heat. Browse the full demo collection and place a test order from cart to confirmation.
            </p>
            <div className="rise d3 mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-primary">
                Shop all sarees
              </Link>
              <Link href="/collections" className="btn btn-outline">
                Explore collections
              </Link>
            </div>
            <ul className="rise d3 mt-10 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink/80">
              <li>✓ 15 sample sarees across silk and cotton</li>
              <li>✓ Flat-rate shipping or local pickup</li>
              <li>✓ Track with your order reference</li>
            </ul>
          </div>

          {hero && (
            <Link href={`/products/${hero.slug}`} className="bloom group relative mx-auto block w-full max-w-md" aria-label={`View ${hero.name}`}>
              <div className="arch border-[6px] border-maroon bg-ivory p-2">
                <div className="arch overflow-hidden">
                  <img src={hero.image_url} alt={hero.image_alt} width={800} height={1000} className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105" fetchPriority="high" />
                </div>
              </div>
              <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap bg-ivory px-5 py-2 text-sm font-semibold text-maroon border border-rule">
                {hero.name} →
              </span>
            </Link>
          )}
        </div>
        <div className="temple-edge" aria-hidden="true" />
      </section>

      {/* COLLECTIONS */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6" aria-labelledby="collections-h">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="collections-h" className="text-4xl sm:text-5xl">
              Shop by collection
            </h2>
            <p className="mt-2 text-muted">Four ways into the loom.</p>
          </div>
          <Link href="/collections" className="link text-sm font-semibold">
            All collections
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {collections.map((c) => (
            <li key={c.id}>
              <Link href={`/collections/${c.slug}`} className="card group block">
                <div className="arch-sm border-2 border-line bg-parchment">
                  <img src={c.image_url} alt="" width={800} height={1000} loading="lazy" className="card-img aspect-[4/5] w-full object-cover" />
                </div>
                <h3 className="mt-3 text-2xl group-hover:text-maroon">{c.name}</h3>
                <p className="text-sm text-muted">{c.product_count} sarees</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* FEATURED */}
      <section className="bg-parchment/60 py-20" aria-labelledby="featured-h">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <OrnamentDivider />
            <h2 id="featured-h" className="mt-3 text-4xl sm:text-5xl">
              This season&rsquo;s favourites
            </h2>
          </div>
          <div className="mt-12">
            <ProductGrid items={featured.items.slice(0, 8)} />
          </div>
          <div className="mt-12 text-center">
            <Link href="/shop" className="btn btn-outline">
              View every saree
            </Link>
          </div>
        </div>
      </section>

      {/* CRAFT */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6" aria-labelledby="craft-h">
        <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-ink">The craft</p>
            <h2 id="craft-h" className="mt-3 text-4xl sm:text-5xl">
              A saree is a conversation between thread, loom and temple.
            </h2>
            <p className="mt-5 text-muted">
              Sample story copy for the demo. A real client would replace this with their own weavers, looms and sourcing details.
            </p>
            <Link href="/about" className="link mt-6 inline-block font-semibold">
              Read more about the craft
            </Link>
          </div>
          <ol className="space-y-0">
            {CRAFT_STEPS.map((s) => (
              <li key={s.n} className="grid grid-cols-[4.5rem_1fr] gap-4 border-t border-line py-7 first:border-t-2 first:border-maroon">
                <span className="font-display text-4xl font-semibold text-gold-ink">{s.n}</span>
                <div>
                  <h3 className="text-2xl">{s.title}</h3>
                  <p className="mt-2 text-muted">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden bg-maroon px-6 py-16 text-center text-ivory sm:py-20">
          <div className="temple-edge absolute inset-x-0 top-0" aria-hidden="true" />
          <h2 className="mx-auto max-w-2xl text-4xl !text-ivory sm:text-5xl">Try the whole journey, no card needed.</h2>
          <p className="mx-auto mt-4 max-w-xl text-ivory/85">
            Add a saree to your cart, check out as a guest and complete a simulated payment. You can then track the order with its reference and email.
          </p>
          <Link href="/shop" className="btn mt-8 bg-ivory text-maroon-deep hover:bg-parchment">
            Start shopping
          </Link>
        </div>
      </section>
    </>
  );
}
