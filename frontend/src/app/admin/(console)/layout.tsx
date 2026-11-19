"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/Brand";
import { api, ApiError } from "@/lib/api";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/shipping", label: "Shipping" },
];

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    api<{ email: string }>("/admin/auth/me")
      .then((m) => setEmail(m.email))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) router.replace("/admin/login");
      });
  }, [router]);

  async function logout() {
    await api("/admin/auth/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/admin/login");
  }

  if (!email) {
    return (
      <div className="grid min-h-screen place-items-center text-muted" aria-busy="true">
        Checking your session…
      </div>
    );
  }

  return (
    <div className="lg:grid lg:grid-cols-[14rem_1fr]">
      <aside className="border-b border-line bg-maroon-deep text-ivory lg:min-h-screen lg:border-b-0">
        <div className="flex items-center gap-2.5 px-5 py-4">
          <LogoMark size={32} />
          <span className="font-display text-xl font-bold">Admin</span>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
            return (
              <Link key={n.href} href={n.href} aria-current={active ? "page" : undefined} className={`whitespace-nowrap px-3 py-2.5 text-sm font-semibold ${active ? "bg-ivory text-maroon-deep" : "text-ivory/85 hover:bg-white/10"}`}>
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden px-5 pt-8 text-xs text-ivory/70 lg:block">
          <p className="truncate">{email}</p>
          <button onClick={logout} className="mt-2 underline underline-offset-4 hover:text-white">
            Sign out
          </button>
          <p className="mt-6">
            <Link href="/" className="underline underline-offset-4">
              View storefront
            </Link>
          </p>
        </div>
      </aside>
      <main id="main" tabIndex={-1} className="min-w-0 px-4 py-8 outline-none sm:px-8">
        <div className="mb-4 flex items-center justify-between text-xs text-muted lg:hidden">
          <span className="truncate">{email}</span>
          <button onClick={logout} className="link">
            Sign out
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
