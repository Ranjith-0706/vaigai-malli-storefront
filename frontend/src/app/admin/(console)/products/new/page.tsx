"use client";

import { ProductForm } from "@/components/ProductForm";

export default function NewProduct() {
  return (
    <div>
      <h1 className="text-4xl sm:text-5xl">New product</h1>
      <ProductForm />
    </div>
  );
}
