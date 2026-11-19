"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { SORTS } from "@/lib/catalogQuery";

type Props = {
  basePath: string;
  categories: string[];
  colors: { name: string; hex: string }[];
  selected: { q: string; category: string[]; color: string[]; min: string; max: string; sort: string; inStock: boolean };
  activeCount: number;
};

/** A plain GET form: works without JavaScript, and auto-submits on change when JS is available. */
export function FilterPanel({ basePath, categories, colors, selected, activeCount }: Props) {
  const form = useRef<HTMLFormElement>(null);
  const submit = () => form.current?.requestSubmit();
  const [show, setShow] = useState(activeCount > 0); // stay open after a filter submit on mobile

  return (
    <div className="border-y border-line lg:border-0">
      <button
        type="button"
        className="flex min-h-12 w-full items-center justify-between py-2 font-semibold text-maroon lg:hidden"
        aria-expanded={show}
        aria-controls="filter-form"
        onClick={() => setShow((v) => !v)}
      >
        <span>Filters &amp; sort{activeCount > 0 && ` (${activeCount})`}</span>
        <span aria-hidden="true" className={`text-xl transition-transform ${show ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      <form id="filter-form" ref={form} method="get" action={basePath} role="search" aria-label="Filter sarees" className={`space-y-7 pb-6 pt-3 lg:block lg:pt-0 ${show ? "block" : "hidden"}`}>
        <div>
          <label htmlFor="f-q" className="label">
            Search
          </label>
          <input id="f-q" name="q" type="search" defaultValue={selected.q} className="field" placeholder="Name, fabric, colour" />
        </div>

        <div>
          <label htmlFor="f-sort" className="label">
            Sort by
          </label>
          <select id="f-sort" name="sort" defaultValue={selected.sort || "featured"} className="field" onChange={submit}>
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="label">Fabric &amp; category</legend>
          <div className="space-y-1">
            {categories.map((c) => (
              <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" name="category" value={c} defaultChecked={selected.category.includes(c)} onChange={submit} className="h-4 w-4 accent-maroon" />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Colour</legend>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <label key={c.name} className="cursor-pointer">
                <input type="checkbox" name="color" value={c.name} defaultChecked={selected.color.includes(c.name)} onChange={submit} className="peer sr-only" />
                <span className="flex min-h-9 items-center gap-2 rounded-full border border-line bg-ivory px-3 text-sm peer-checked:border-maroon peer-checked:bg-maroon peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf">
                  <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-ink/25" style={{ background: c.hex }} />
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="label">Price (₹)</legend>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="f-min" className="sr-only">
                Minimum price in rupees
              </label>
              <input id="f-min" name="min" type="number" inputMode="numeric" min={0} step={100} defaultValue={selected.min} placeholder="Min" className="field" />
            </div>
            <span aria-hidden="true">–</span>
            <div className="flex-1">
              <label htmlFor="f-max" className="sr-only">
                Maximum price in rupees
              </label>
              <input id="f-max" name="max" type="number" inputMode="numeric" min={0} step={100} defaultValue={selected.max} placeholder="Max" className="field" />
            </div>
          </div>
        </fieldset>

        <label className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" name="in_stock" value="true" defaultChecked={selected.inStock} onChange={submit} className="h-4 w-4 accent-maroon" />
          In stock only
        </label>

        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary btn-sm flex-1">
            Apply
          </button>
          {activeCount > 0 && (
            <Link href={basePath} className="btn btn-outline btn-sm" scroll={false}>
              Clear all
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
