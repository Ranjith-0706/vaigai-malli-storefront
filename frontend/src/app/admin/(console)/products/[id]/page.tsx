"use client";

import { useParams } from "next/navigation";
import { ProductForm } from "@/components/ProductForm";
import { useAdminData } from "@/lib/adminApi";
import type { AdminProduct } from "@/lib/types";

export default function EditProduct() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading } = useAdminData<AdminProduct>(`/admin/products/${id}`);
  if (error) return <p role="alert" className="text-danger">{error}</p>;
  if (loading || !data) return <div className="h-64 animate-pulse bg-parchment" aria-busy="true" />;
  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">Edit product</h1>
      <p className="mt-1 text-sm text-muted">
        {data.is_active ? "Active on the storefront." : "Archived: hidden from the storefront."}
      </p>
      <ProductForm product={data} key={data.id} />
    </div>
  );
}
