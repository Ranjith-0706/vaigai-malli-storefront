import type { Metadata } from "next";
import { OrderLookupForm } from "@/components/OrderLookupForm";

export const metadata: Metadata = { title: "Track your order" };

export default function OrderStatusPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <h1 className="text-5xl">Track your order</h1>
      <p className="mt-3 mb-8 text-muted">Enter the reference from your confirmation (it starts with VM-) and the email you used at checkout.</p>
      <OrderLookupForm />
    </div>
  );
}
