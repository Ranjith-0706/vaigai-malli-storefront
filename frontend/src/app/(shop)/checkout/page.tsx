"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { OrderSummary } from "@/components/OrderSummary";
import { api, ApiError } from "@/lib/api";
import { useCart } from "@/lib/CartProvider";
import { formatINR } from "@/lib/format";
import { INDIAN_STATES, validateCheckout, type CheckoutForm } from "@/lib/india";
import type { Order } from "@/lib/types";
import { useQuote } from "@/lib/useQuote";

const EMPTY: CheckoutForm = { name: "", email: "", phone: "", line1: "", line2: "", city: "", state: "", pincode: "" };

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="hint mt-1">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-err`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, ready, clear } = useCart();
  const [method, setMethod] = useState<string | undefined>(undefined);
  const { quote, loading, error: quoteError, reload } = useQuote(items, ready, method);
  const [form, setForm] = useState<CheckoutForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const idemKey = useRef<string>("");
  const errSummary = useRef<HTMLDivElement>(null);

  useEffect(() => {
    idemKey.current = crypto.randomUUID();
  }, []);

  const chosen = quote?.shipping_options.find((o) => o.code === (method ?? quote.shipping_method));
  const needsAddress = chosen?.requires_address ?? true;
  const goodLines = quote?.lines.filter((l) => l.status === "ok" || l.status === "reduced") ?? [];
  const blocked = quote?.lines.some((l) => l.status === "out_of_stock" || l.status === "unavailable" || l.status === "reduced") ?? false;

  function set<K extends keyof CheckoutForm>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined }));
  }
  const a11y = (k: keyof CheckoutForm) => ({
    "aria-invalid": errors[k] ? (true as const) : undefined,
    "aria-describedby": errors[k] ? `${k}-err` : undefined,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || !quote || !chosen) return;
    setFormError(null);
    const v = validateCheckout(form, needsAddress);
    setErrors(v);
    if (Object.keys(v).length > 0) {
      setFormError("Please fix the highlighted fields.");
      requestAnimationFrame(() => {
        errSummary.current?.focus();
        const first = Object.keys(v)[0];
        (document.getElementById(first) as HTMLElement | null)?.focus();
      });
      return;
    }
    setSubmitting(true);
    try {
      const order = await api<Order>("/checkout/orders", {
        method: "POST",
        headers: { "Idempotency-Key": idemKey.current },
        json: {
          items,
          contact: { name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
          address: needsAddress ? { line1: form.line1.trim(), line2: form.line2.trim(), city: form.city.trim(), state: form.state, pincode: form.pincode.trim() } : undefined,
          shipping_method: chosen.code,
        },
      });
      try {
        sessionStorage.setItem(`vm_email_${order.reference}`, form.email.trim().toLowerCase());
      } catch {
        /* the order page will ask for the email */
      }
      clear();
      router.push(`/checkout/payment/${order.reference}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422) {
          const fe = err.fieldErrors;
          const mapped: Partial<Record<keyof CheckoutForm, string>> = {};
          for (const k of Object.keys(EMPTY) as (keyof CheckoutForm)[]) {
            const key = k === "line1" || k === "line2" ? k : k;
            if (fe[key]) mapped[k] = fe[key];
          }
          setErrors(mapped);
          setFormError(Object.keys(mapped).length ? "Please fix the highlighted fields." : err.message);
        } else if (err.code === "stock_unavailable") {
          setFormError("Some items just sold out or have fewer pieces left than in your cart. We refreshed your cart; please review it.");
          idemKey.current = crypto.randomUUID();
          void reload();
        } else {
          setFormError(err.message);
        }
      } else {
        setFormError("We could not reach the server. Your cart is safe. Please try again.");
      }
      setSubmitting(false);
      requestAnimationFrame(() => errSummary.current?.focus());
    }
  }

  if (ready && items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="text-5xl">Nothing to check out</h1>
        <p className="mt-4 text-muted">Your cart is empty.</p>
        <Link href="/shop" className="btn btn-primary mt-8">
          Browse sarees
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6">
      <h1 className="border-b border-rule pb-4 text-4xl sm:text-5xl">Checkout</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">Guest checkout. This is a demo: the next step is a simulated payment and no money is charged.</p>

      {quoteError && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 border border-danger bg-danger-soft px-4 py-3 text-sm text-danger">
          {quoteError}{" "}
          <button className="btn btn-outline btn-sm" type="button" onClick={() => void reload()}>
            Retry
          </button>
        </div>
      )}

      <form onSubmit={submit} noValidate className="mt-10 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="space-y-10">
          <div ref={errSummary} tabIndex={-1} className="outline-none">
            {formError && (
              <div role="alert" className="border border-danger bg-danger-soft px-4 py-3 text-sm text-danger" data-testid="form-error">
                {formError}
              </div>
            )}
          </div>

          <fieldset className="space-y-4">
            <legend className="font-display text-3xl font-semibold text-maroon-deep">1. Contact</legend>
            <Field id="name" label="Full name" error={errors.name}>
              <input id="name" className="field" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} {...a11y("name")} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="email" label="Email" error={errors.email} hint="We use this to look up your order.">
                <input id="email" type="email" className="field" autoComplete="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} {...a11y("email")} />
              </Field>
              <Field id="phone" label="Mobile number" error={errors.phone} hint="10-digit Indian mobile">
                <input id="phone" type="tel" className="field" autoComplete="tel-national" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} {...a11y("phone")} />
              </Field>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="font-display text-3xl font-semibold text-maroon-deep">2. Delivery method</legend>
            {!quote && loading && <div className="h-24 animate-pulse bg-parchment" aria-busy="true" />}
            {quote?.shipping_options.map((o) => {
              const selected = chosen?.code === o.code;
              return (
                <label key={o.code} className={`flex cursor-pointer gap-3 border-[1.5px] p-4 ${selected ? "border-maroon bg-parchment/70" : "border-line hover:border-maroon-soft"}`}>
                  <input type="radio" name="shipping" value={o.code} checked={selected} onChange={() => setMethod(o.code)} className="mt-1 h-4 w-4 accent-maroon" />
                  <span className="flex-1">
                    <span className="flex justify-between gap-3 font-semibold">
                      {o.label}
                      <span data-testid={`ship-${o.code}`}>{o.price_paise === 0 ? "Free" : formatINR(o.price_paise)}</span>
                    </span>
                    <span className="block text-sm text-muted">{o.description}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>

          {needsAddress && (
            <fieldset className="space-y-4">
              <legend className="font-display text-3xl font-semibold text-maroon-deep">3. Shipping address</legend>
              <Field id="line1" label="Address line 1" error={errors.line1}>
                <input id="line1" className="field" autoComplete="address-line1" value={form.line1} onChange={(e) => set("line1", e.target.value)} {...a11y("line1")} />
              </Field>
              <Field id="line2" label="Address line 2 (optional)">
                <input id="line2" className="field" autoComplete="address-line2" value={form.line2} onChange={(e) => set("line2", e.target.value)} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field id="city" label="City" error={errors.city}>
                  <input id="city" className="field" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} {...a11y("city")} />
                </Field>
                <Field id="pincode" label="PIN code" error={errors.pincode}>
                  <input id="pincode" className="field" autoComplete="postal-code" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => set("pincode", e.target.value.replace(/\D/g, ""))} {...a11y("pincode")} />
                </Field>
              </div>
              <Field id="state" label="State / union territory" error={errors.state}>
                <select id="state" className="field" autoComplete="address-level1" value={form.state} onChange={(e) => set("state", e.target.value)} {...a11y("state")}>
                  <option value="">Select…</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <p className="hint">Country: India</p>
            </fieldset>
          )}

          <section aria-labelledby="pay-h">
            <h2 id="pay-h" className="font-display text-3xl font-semibold text-maroon-deep">
              {needsAddress ? "4" : "3"}. Payment
            </h2>
            <p className="mt-2 border border-gold/50 bg-parchment px-4 py-3 text-sm">
              <strong>Demo payment mode.</strong> On the next screen you can complete or fail a <em>simulated</em> payment. No card details are collected and no money is charged.
            </p>
          </section>
        </div>

        <div className="lg:sticky lg:top-32 lg:self-start">
          {quote && (
            <OrderSummary
              lines={goodLines.map((l) => ({ key: l.product_id, name: l.name, quantity: l.quantity, total: l.line_total_paise, image: l.image_url }))}
              subtotal={quote.subtotal_paise}
              shipping={quote.shipping_paise}
              total={quote.total_paise}
              shippingLabel={chosen?.label}
              note="Prices and shipping are calculated by the server and confirmed again when you place the order."
            />
          )}
          {blocked && (
            <p role="alert" className="mt-4 text-sm text-danger">
              Your cart needs attention.{" "}
              <Link href="/cart" className="link">
                Review cart
              </Link>
            </p>
          )}
          <button type="submit" className="btn btn-primary mt-4 w-full" disabled={submitting || !quote || blocked || loading}>
            {submitting ? "Placing order…" : quote ? `Place order · ${formatINR(quote.total_paise)}` : "Place order"}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Items are reserved for 30 minutes while you pay.</p>
        </div>
      </form>
    </div>
  );
}
