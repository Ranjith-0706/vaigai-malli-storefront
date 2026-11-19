"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function OrderLookupForm({ initialRef = "", error }: { initialRef?: string; error?: string | null }) {
  const router = useRouter();
  const [ref, setRef] = useState(initialRef);
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = ref.trim().toUpperCase();
    try {
      sessionStorage.setItem(`vm_email_${r}`, email.trim().toLowerCase());
    } catch {
      /* ignore */
    }
    router.push(`/order/${encodeURIComponent(r)}`);
  }

  return (
    <form onSubmit={submit} className="space-y-4" aria-label="Find your order">
      {error && (
        <p role="alert" className="border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" data-testid="lookup-error">
          {error}
        </p>
      )}
      <div>
        <label htmlFor="ref" className="label">
          Order reference
        </label>
        <input id="ref" className="field font-mono uppercase" required placeholder="VM-XXXXXXXX" value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="lookup-email" className="label">
          Email used at checkout
        </label>
        <input id="lookup-email" type="email" className="field" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>
      <button className="btn btn-primary w-full" type="submit">
        Find my order
      </button>
    </form>
  );
}
