import { describe, expect, it } from "vitest";
import { addItem, MAX_LINE_QTY, removeItem, sanitize, setQuantity, totalCount } from "./cart";
import { activeChips, activeFilterCount, buildFilterHref, filterStateFromParams, resultSummary, toApiQuery, withParams } from "./catalogQuery";
import { formatINR, rupeesToPaise } from "./format";
import { validateCheckout, type CheckoutForm } from "./india";

describe("money formatting", () => {
  it("formats integer paise as INR with Indian grouping", () => {
    expect(formatINR(2850000)).toBe("₹28,500");
    expect(formatINR(15000)).toBe("₹150");
    expect(formatINR(12345)).toBe("₹123.45");
    expect(formatINR(0)).toBe("₹0");
    expect(formatINR(10000000)).toBe("₹1,00,000");
  });
  it("parses rupee input into paise without float drift", () => {
    expect(rupeesToPaise("1,299.50")).toBe(129950);
    expect(rupeesToPaise("₹ 500")).toBe(50000);
    expect(rupeesToPaise("0.29")).toBe(29);
    expect(rupeesToPaise("")).toBeNull();
    expect(rupeesToPaise("-5")).toBeNull();
    expect(rupeesToPaise("abc")).toBeNull();
  });
});

describe("cart helpers", () => {
  it("adds, merges and caps quantities", () => {
    let items = addItem([], 1, 2);
    items = addItem(items, 1, 3);
    expect(items).toEqual([{ product_id: 1, quantity: 5 }]);
    expect(addItem(items, 1, 20)[0].quantity).toBe(MAX_LINE_QTY);
    expect(addItem([], 2, 5, 2)[0].quantity).toBe(2); // limited by stock
  });
  it("sets quantity, removing the line at zero", () => {
    const items = [{ product_id: 1, quantity: 2 }];
    expect(setQuantity(items, 1, 4)[0].quantity).toBe(4);
    expect(setQuantity(items, 1, 0)).toEqual([]);
    expect(removeItem(items, 1)).toEqual([]);
    expect(totalCount([{ product_id: 1, quantity: 2 }, { product_id: 2, quantity: 3 }])).toBe(5);
  });
  it("sanitizes corrupt persisted data", () => {
    expect(sanitize("nope")).toEqual([]);
    expect(
      sanitize([{ product_id: 1, quantity: 2 }, { product_id: 1, quantity: 2 }, { product_id: -3, quantity: 1 }, { product_id: 2, quantity: 0 }, { product_id: "x", quantity: 1 }, null]),
    ).toEqual([{ product_id: 1, quantity: 4 }]);
  });
});

describe("catalogue query building", () => {
  it("translates URL filters (rupees) to API params (paise)", () => {
    const q = new URLSearchParams(
      toApiQuery({ q: " silk ", category: ["Soft Silk", "Silk Cotton"], color: "Ivory", min: "5000", max: "20000.50", sort: "price_asc", page: "3", in_stock: "true" }),
    );
    expect(q.get("q")).toBe("silk");
    expect(q.getAll("category")).toEqual(["Soft Silk", "Silk Cotton"]);
    expect(q.get("min_price")).toBe("500000");
    expect(q.get("max_price")).toBe("2000050");
    expect(q.get("sort")).toBe("price_asc");
    expect(q.get("page")).toBe("3");
    expect(q.get("in_stock")).toBe("true");
  });
  it("ignores invalid sort, page and prices", () => {
    const q = new URLSearchParams(toApiQuery({ sort: "DROP TABLE", page: "-2", min: "abc" }));
    expect(q.has("sort")).toBe(false);
    expect(q.has("page")).toBe(false);
    expect(q.has("min_price")).toBe(false);
  });
  it("builds pagination links preserving filters, and counts filters", () => {
    expect(withParams("/shop", { category: ["A", "B"], page: "2" }, { page: "3" })).toBe("/shop?category=A&category=B&page=3");
    expect(withParams("/shop", { page: "2" }, { page: null })).toBe("/shop");
    expect(activeFilterCount({ category: ["A"], color: ["Red", "Blue"], min: "1" })).toBe(4);
  });
});

describe("checkout validation", () => {
  const ok: CheckoutForm = { name: "Asha Rao", email: "asha@example.com", phone: "98765 43210", line1: "12 Temple St", line2: "", city: "Madurai", state: "Tamil Nadu", pincode: "625001" };
  it("accepts a valid Indian address", () => {
    expect(validateCheckout(ok, true)).toEqual({});
  });
  it("rejects bad email, phone, PIN and state", () => {
    const e = validateCheckout({ ...ok, email: "x", phone: "12345", pincode: "012345", state: "Narnia" }, true);
    expect(Object.keys(e).sort()).toEqual(["email", "phone", "pincode", "state"]);
  });
  it("skips address checks for pickup", () => {
    expect(validateCheckout({ ...ok, line1: "", city: "", state: "", pincode: "" }, false)).toEqual({});
  });
});

describe("filter URL helpers", () => {
  const sp = { q: " ivory ", category: ["Soft Silk", "Silk Cotton"], color: "Ivory", min: "5000", max: "20000", in_stock: "true", sort: "price_asc", page: "3" };

  it("round-trips URL params through the filter state and drops page", () => {
    const state = filterStateFromParams(sp);
    expect(state).toMatchObject({ q: " ivory ", category: ["Soft Silk", "Silk Cotton"], color: ["Ivory"], min: "5000", max: "20000", inStock: true, sort: "price_asc" });
    const href = buildFilterHref("/shop", state);
    expect(href).toBe("/shop?q=ivory&category=Soft+Silk&category=Silk+Cotton&color=Ivory&min=5000&max=20000&in_stock=true&sort=price_asc");
    expect(href).not.toContain("page=");
  });
  it("omits empty values, the default sort and unknown sorts", () => {
    expect(buildFilterHref("/collections/x", filterStateFromParams({}))).toBe("/collections/x");
    expect(buildFilterHref("/shop", filterStateFromParams({ sort: "featured" }))).toBe("/shop");
    expect(buildFilterHref("/shop", filterStateFromParams({ sort: "bogus" }))).toBe("/shop");
  });
  it("builds one removable chip per active filter, each linking to the state without it", () => {
    const chips = activeChips("/shop", sp);
    expect(chips.map((c) => c.label)).toEqual(["Search: “ivory”", "Soft Silk", "Silk Cotton", "Ivory", "From ₹5,000", "Up to ₹20,000", "In stock only"]);
    const soft = chips.find((c) => c.label === "Soft Silk")!;
    expect(soft.href).toContain("category=Silk+Cotton");
    expect(soft.href).not.toContain("category=Soft");
    expect(soft.href).toContain("sort=price_asc"); // sort is kept
    expect(chips.find((c) => c.label === "In stock only")!.href).not.toContain("in_stock");
    expect(activeChips("/shop", {})).toEqual([]);
    expect(chips).toHaveLength(activeFilterCount(sp));
  });
  it("describes the result count with collection and search term", () => {
    expect(resultSummary(15, {})).toBe("15 sarees");
    expect(resultSummary(1, {})).toBe("1 saree");
    expect(resultSummary(4, { collectionName: "Kanchipuram Silk" })).toBe("4 sarees in Kanchipuram Silk");
    expect(resultSummary(0, { q: "zzzz" })).toBe("0 sarees matching “zzzz”");
    expect(resultSummary(2, { collectionName: "Temple Border Classics", q: "red" })).toBe("2 sarees in Temple Border Classics matching “red”");
  });
});
