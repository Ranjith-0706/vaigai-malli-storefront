import Link from "next/link";
import { SITE } from "@/lib/site";

const COLS = [
  {
    title: "Shop",
    links: [
      ["All sarees", "/shop"],
      ["Collections", "/collections"],
      ["Track an order", "/order-status"],
    ],
  },
  {
    title: "Help",
    links: [
      ["Shipping", "/shipping"],
      ["Returns", "/returns"],
      ["Contact", "/contact"],
    ],
  },
  {
    title: "About",
    links: [
      ["Our craft", "/about"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 bg-maroon-deep text-ivory no-print">
      <div className="temple-edge" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="font-display text-3xl font-bold">{SITE.name}</p>
          <p className="mt-3 max-w-xs text-sm text-ivory/80">{SITE.tagline}. A portfolio demo storefront: every product, price, policy and contact detail here is sample data.</p>
        </div>
        {COLS.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="font-sans text-xs font-semibold uppercase tracking-[0.2em] !text-gold">{c.title}</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([label, href]) => (
                <li key={href}>
                  <Link href={href} className="text-ivory/90 hover:text-white hover:underline underline-offset-4">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ivory/15 px-4 py-5 text-center text-xs text-ivory/70">
        © {new Date().getFullYear()} {SITE.name} demo · Not a real business · Payments are simulated · Illustrations are original artwork made for this project
      </div>
    </footer>
  );
}
