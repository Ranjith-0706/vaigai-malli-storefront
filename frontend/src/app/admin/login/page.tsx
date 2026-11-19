"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/Brand";
import { api, ApiError } from "@/lib/api";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/admin/auth/login", { method: "POST", json: { email, password } });
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the API. Is it running?");
      setBusy(false);
    }
  }

  return (
    <main id="main" className="grid min-h-screen place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm border border-line bg-ivory p-8 shadow-card" aria-labelledby="login-h">
        <div className="flex items-center gap-3">
          <LogoMark size={40} />
          <div>
            <h1 id="login-h" className="text-3xl">
              Admin sign in
            </h1>
            <p className="text-xs text-muted">Vaigai Malli demo console</p>
          </div>
        </div>
        {error && (
          <p role="alert" className="mt-5 border border-danger bg-danger-soft px-3 py-2 text-sm text-danger" data-testid="login-error">
            {error}
          </p>
        )}
        <div className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="label">
              Email
            </label>
            <input id="email" type="email" className="field" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label htmlFor="password" className="label">
              Password
            </label>
            <input id="password" type="password" className="field" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
        <p className="mt-5 text-xs text-muted">No default password exists. Create an admin with the documented CLI command (see docs/SETUP_AND_DEPLOYMENT.md).</p>
      </form>
    </main>
  );
}
