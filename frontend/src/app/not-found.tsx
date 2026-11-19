import Link from "next/link";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-xl px-4 py-28 text-center">
        <p className="font-display text-8xl text-gold-ink">404</p>
        <h1 className="mt-2 text-5xl">This page has unravelled</h1>
        <p className="mt-4 text-muted">The page you wanted does not exist, or the saree is no longer on the shelf.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/shop" className="btn btn-primary">
            Browse sarees
          </Link>
          <Link href="/" className="btn btn-outline">
            Home
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
