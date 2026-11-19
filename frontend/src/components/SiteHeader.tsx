"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/CartProvider";
import { SITE } from "@/lib/site";
import { LogoMark } from "./Brand";

const NAV = [
  { href: "/shop", label: "Shop all" },
  { href: "/collections", label: "Collections" },
  { href: "/about", label: "Our craft" },
  { href: "/order-status", label: "Track order" },
];

export function SiteHeader() {
  const { count } = useCart();
  const path = usePathname();
  const router = useRouter();
  // Menu/search are tied to the path they were opened on, so navigating closes them without an effect.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const [searchAt, setSearchAt] = useState<string | null>(null);
  const open = openAt === path;
  const searching = searchAt === path;
  const setOpen = (v: boolean) => setOpenAt(v ? path : null);
  const setSearching = (fn: (s: boolean) => boolean) => setSearchAt(fn(searching) ? path : null);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenAt(null);
        menuBtn.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (searching) searchInput.current?.focus();
  }, [searching]);

  function onSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get("q") ?? "").trim();
    router.push(q ? `/shop?q=${encodeURIComponent(q)}` : "/shop");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ivory/95 backdrop-blur-sm no-print">
      <div className="bg-maroon-deep px-4 py-1.5 text-center text-xs tracking-wide text-ivory" role="note">
        <strong className="font-semibold">Demo store</strong> · sample products &amp; policies · payments are simulated, no money is charged
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <button
          ref={menuBtn}
          type="button"
          className="-ml-2 grid h-11 w-11 place-items-center text-maroon lg:hidden"
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen(true)}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M3 7h18M3 12h18M3 17h18" />
          </svg>
        </button>

        <Link href="/" className="flex items-center gap-2.5" aria-label={`${SITE.name} home`}>
          <LogoMark size={38} />
          <span className="leading-[1.05]">
            <span className="font-display text-[1.6rem] font-bold text-maroon-deep">{SITE.name}</span>
            <span className="mt-1 hidden text-[0.62rem] uppercase tracking-[0.22em] text-gold-ink sm:block">Silks &amp; handlooms</span>
          </span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path === n.href || path.startsWith(n.href + "/") ? "page" : undefined}
              className="relative py-1 text-sm font-semibold tracking-wide text-ink hover:text-maroon aria-[current=page]:text-maroon aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:-bottom-0.5 aria-[current=page]:after:h-0.5 aria-[current=page]:after:bg-gold"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="grid h-11 w-11 place-items-center text-maroon"
            aria-label="Search sarees"
            aria-expanded={searching}
            onClick={() => setSearching((s) => !s)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 5 5" />
            </svg>
          </button>
          <Link href="/cart" className="relative grid h-11 w-11 place-items-center text-maroon" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}>
            <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M5 8h14l-1 12H6L5 8Z" />
              <path d="M9 8V6a3 3 0 0 1 6 0v2" />
            </svg>
            {count > 0 && (
              <span data-testid="cart-count" className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-maroon px-1 text-[0.7rem] font-bold text-ivory">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>

      {searching && (
        <form role="search" onSubmit={onSearch} className="border-t border-line bg-parchment px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl gap-2">
            <label htmlFor="site-search" className="sr-only">
              Search sarees by name, fabric or colour
            </label>
            <input ref={searchInput} id="site-search" name="q" type="search" className="field" placeholder="Search by name, fabric or colour" />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </div>
        </form>
      )}

      {open && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 flex lg:hidden">
          <div className="flex w-[84%] max-w-sm flex-col bg-ivory p-6 shadow-2xl rise">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-display text-2xl font-bold text-maroon-deep">{SITE.name}</span>
              <button type="button" className="grid h-11 w-11 place-items-center text-maroon" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              </button>
            </div>
            <nav aria-label="Mobile" className="flex flex-col">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="border-b border-line py-4 font-display text-2xl font-semibold text-maroon-deep">
                  {n.label}
                </Link>
              ))}
              <Link href="/cart" className="border-b border-line py-4 font-display text-2xl font-semibold text-maroon-deep">
                Cart {count > 0 && `(${count})`}
              </Link>
            </nav>
            <div className="temple-edge mt-auto" aria-hidden="true" />
          </div>
          <button type="button" aria-label="Close menu" className="flex-1 bg-maroon-deep/50" onClick={() => setOpen(false)} tabIndex={-1} />
        </div>
      )}
    </header>
  );
}
