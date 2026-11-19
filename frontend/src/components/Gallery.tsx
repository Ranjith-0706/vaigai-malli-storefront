"use client";

import { useState } from "react";
import type { ProductImage } from "@/lib/types";

export function Gallery({ images, inStock }: { images: ProductImage[]; inStock: boolean }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];
  if (!current) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-[5rem_1fr] sm:items-start">
      <div className="order-2 flex gap-2 sm:order-1 sm:flex-col" role="group" aria-label="Product images">
        {images.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Show image ${i + 1} of ${images.length}: ${img.alt}`}
            aria-pressed={i === active}
            className={`aspect-[4/5] w-16 shrink-0 overflow-hidden border-2 bg-parchment sm:w-full ${i === active ? "border-maroon" : "border-transparent hover:border-gold"}`}
          >
            <img src={img.url} alt="" width={160} height={200} loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
      <div className="order-1 sm:order-2">
        <div className="relative aspect-[4/5] overflow-hidden bg-parchment">
          <img
            key={current.id}
            src={current.url}
            alt={current.alt}
            width={800}
            height={1000}
            fetchPriority="high"
            className={`bloom h-full w-full object-cover ${inStock ? "" : "opacity-70"}`}
            data-testid="main-image"
          />
        </div>
        <p className="mt-2 text-xs text-muted">Illustrative artwork created for this demo, not a photograph of a real garment.</p>
      </div>
    </div>
  );
}
