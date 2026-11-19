"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { buildFilterHref, SORTS, type FilterState } from "@/lib/catalogQuery";

type Props = {
  basePath: string;
  categories: string[];
  colors: { name: string; hex: string }[];
  state: FilterState;
  activeCount: number;
};

const DESKTOP = "(min-width: 1024px)";
function useIsDesktop() {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(DESKTOP);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(DESKTOP).matches,
    () => false,
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" className="transition-transform group-open:rotate-180">
      <path d="m2 4.5 4 4 4-4" />
    </svg>
  );
}

const GROUPS = "details[data-group][open]";

/**
 * Horizontal filter bar. It is a plain GET form, so it works without JavaScript (the groups are native <details>).
 * With JavaScript the URL stays the single source of truth: on desktop each change navigates immediately;
 * on narrow screens changes are staged and applied with "Show results".
 */
export function FilterBar({ basePath, categories, colors, state, activeCount }: Props) {
  const router = useRouter();
  const desktop = useIsDesktop();
  const form = useRef<HTMLFormElement>(null);
  const [showMobile, setShowMobile] = useState(false);

  // Re-sync local form state whenever the URL (and so the server-provided state) changes, e.g. back/forward or chip links.
  const urlKey = buildFilterHref(basePath, state);
  const [seenKey, setSeenKey] = useState(urlKey);
  const [f, setF] = useState<FilterState>(state);
  if (urlKey !== seenKey) {
    setSeenKey(urlKey);
    setF(state);
  }

  const openGroups = () => Array.from(form.current?.querySelectorAll<HTMLDetailsElement>(GROUPS) ?? []);
  function go(next: FilterState) {
    openGroups().forEach((d) => d.removeAttribute("open"));
    router.push(buildFilterHref(basePath, next), { scroll: false });
  }
  function update(patch: Partial<FilterState>) {
    const next = { ...f, ...patch };
    setF(next);
    if (desktop) go(next);
  }
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    go(f);
    if (!desktop) {
      setShowMobile(false);
      document.getElementById("results")?.scrollIntoView({ block: "start" });
    }
  }
  // Desktop popovers behave like menus: one open at a time; Escape, outside click and tabbing away close them.
  function onGroupToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    if (!desktop || !e.currentTarget.open) return;
    openGroups().forEach((d) => {
      if (d !== e.currentTarget) d.removeAttribute("open");
    });
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== "Escape" || !desktop) return;
    const open = openGroups()[0];
    if (open) {
      open.removeAttribute("open");
      open.querySelector("summary")?.focus();
    }
  }
  function onBlurCapture(e: React.FocusEvent) {
    const next = e.relatedTarget as Node | null;
    if (!desktop || !next) return;
    openGroups().forEach((d) => {
      if (d.contains(e.target as Node) && !d.contains(next)) d.removeAttribute("open");
    });
  }
  function onPointerDown(e: React.PointerEvent<HTMLElement>) {
    if (!desktop) return;
    openGroups().forEach((d) => {
      if (!d.contains(e.target as Node)) d.removeAttribute("open");
    });
  }

  const summaryCls =
    "group flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 py-2 text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-maroon-deep hover:text-maroon lg:min-h-10 lg:justify-start [&::-webkit-details-marker]:hidden";
  const panelCls = "pb-4 lg:absolute lg:left-0 lg:top-full lg:z-30 lg:mt-1 lg:border lg:border-line lg:bg-ivory lg:p-4";
  const groupCls = "relative border-b border-line lg:border-0";
  const applyCls = "btn btn-primary btn-sm mt-3 hidden w-full lg:inline-flex";
  const toggleLabelCls = "text-[0.8rem] font-semibold uppercase tracking-[0.14em] text-maroon-deep";

  return (
    <div className="border-y border-rule" onPointerDown={onPointerDown}>
      <button
        type="button"
        className={`flex min-h-12 w-full items-center justify-between lg:hidden ${toggleLabelCls}`}
        aria-expanded={showMobile}
        aria-controls="filter-form"
        onClick={() => setShowMobile((v) => !v)}
      >
        <span>Filters &amp; sort{activeCount > 0 && ` (${activeCount})`}</span>
        <span aria-hidden="true" className={`text-xl leading-none transition-transform ${showMobile ? "rotate-45" : ""}`}>
          +
        </span>
      </button>

      <form
        id="filter-form"
        ref={form}
        method="get"
        action={basePath}
        role="search"
        aria-label="Filter sarees"
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        onBlurCapture={onBlurCapture}
        className={`${showMobile ? "block" : "hidden"} lg:flex lg:items-center lg:gap-x-7`}
      >
        <div className="border-b border-line py-3 lg:w-64 lg:border-0 lg:py-1.5">
          <label htmlFor="f-q" className="label lg:sr-only">
            Search
          </label>
          <input
            id="f-q"
            name="q"
            type="search"
            value={f.q}
            onChange={(e) => setF({ ...f, q: e.target.value })}
            className="field lg:!min-h-10 lg:!py-1.5"
            placeholder="Search name, fabric, colour"
          />
        </div>

        <details data-group="category" className={groupCls} onToggle={onGroupToggle}>
          <summary className={summaryCls}>
            <span>
              Fabric{f.category.length > 0 && <span className="ml-1 text-gold-ink">({f.category.length})</span>}
            </span>
            <Chevron />
          </summary>
          <fieldset className={`${panelCls} lg:w-64`}>
            <legend className="sr-only">Fabric and category</legend>
            <div className="space-y-0.5">
              {categories.map((c) => (
                <label key={c} className="flex min-h-9 cursor-pointer items-center gap-2.5 text-sm">
                  <input type="checkbox" name="category" value={c} checked={f.category.includes(c)} onChange={() => update({ category: toggle(f.category, c) })} className="h-4 w-4 accent-maroon" />
                  {c}
                </label>
              ))}
            </div>
            <button type="submit" className={applyCls}>
              Apply
            </button>
          </fieldset>
        </details>

        <details data-group="color" className={groupCls} onToggle={onGroupToggle}>
          <summary className={summaryCls}>
            <span>
              Colour{f.color.length > 0 && <span className="ml-1 text-gold-ink">({f.color.length})</span>}
            </span>
            <Chevron />
          </summary>
          <fieldset className={`${panelCls} lg:w-[22rem]`}>
            <legend className="sr-only">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <label key={c.name} className="cursor-pointer">
                  <input type="checkbox" name="color" value={c.name} checked={f.color.includes(c.name)} onChange={() => update({ color: toggle(f.color, c.name) })} className="peer sr-only" />
                  <span className="flex min-h-9 items-center gap-2 rounded-full border border-line bg-ivory px-3 text-sm peer-checked:border-maroon peer-checked:bg-maroon peer-checked:text-ivory peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-leaf">
                    <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full border border-ink/25" style={{ background: c.hex }} />
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
            <button type="submit" className={applyCls}>
              Apply
            </button>
          </fieldset>
        </details>

        <details data-group="price" className={groupCls} onToggle={onGroupToggle}>
          <summary className={summaryCls}>
            <span>
              Price{(f.min || f.max) && <span className="ml-1 text-gold-ink">(set)</span>}
            </span>
            <Chevron />
          </summary>
          <fieldset className={`${panelCls} lg:w-64`}>
            <legend className="sr-only">Price in rupees</legend>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label htmlFor="f-min" className="sr-only">
                  Minimum price in rupees
                </label>
                <input id="f-min" name="min" type="number" inputMode="numeric" min={0} step={100} value={f.min} onChange={(e) => setF({ ...f, min: e.target.value })} placeholder="Min ₹" className="field" />
              </div>
              <span aria-hidden="true">–</span>
              <div className="flex-1">
                <label htmlFor="f-max" className="sr-only">
                  Maximum price in rupees
                </label>
                <input id="f-max" name="max" type="number" inputMode="numeric" min={0} step={100} value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} placeholder="Max ₹" className="field" />
              </div>
            </div>
            <button type="submit" className={applyCls}>
              Apply
            </button>
          </fieldset>
        </details>

        <label className={`flex min-h-11 cursor-pointer items-center gap-2.5 border-b border-line lg:min-h-10 lg:border-0 ${toggleLabelCls}`}>
          <input type="checkbox" name="in_stock" value="true" checked={f.inStock} onChange={() => update({ inStock: !f.inStock })} className="h-4 w-4 accent-maroon" />
          In stock only
        </label>

        <div className="flex items-center gap-3 py-3 lg:ml-auto lg:py-1.5">
          <label htmlFor="f-sort" className={toggleLabelCls}>
            Sort
          </label>
          <select id="f-sort" name="sort" value={f.sort} onChange={(e) => update({ sort: e.target.value })} className="field !w-auto lg:!min-h-10 lg:min-w-48 lg:!py-1.5">
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* narrow screens: staged changes are applied explicitly */}
        <div className="sticky bottom-0 flex gap-2 border-t border-line bg-ivory py-3 lg:hidden">
          <button type="submit" className="btn btn-primary btn-sm flex-1">
            Show results
          </button>
          {activeCount > 0 && (
            <Link href={basePath} className="btn btn-outline btn-sm" scroll={false} onClick={() => setShowMobile(false)}>
              Clear all
            </Link>
          )}
        </div>
      </form>
    </div>
  );
}
