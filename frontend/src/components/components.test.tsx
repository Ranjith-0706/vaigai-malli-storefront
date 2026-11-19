import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CartProvider, useCart } from "@/lib/CartProvider";
import type { ProductSummary } from "@/lib/types";
import { AddToCart } from "./AddToCart";
import { ProductCard } from "./ProductCard";

const base: ProductSummary = {
  id: 1, slug: "x", name: "Test Silk", category: "Soft Silk", fabric: "Silk", color: "Ivory", color_hex: "#eee",
  price_paise: 950000, compare_at_paise: null, stock: 5, in_stock: true, low_stock: false, featured: false,
  image_url: "/a.svg", image_alt: "Test Silk saree", collection_slug: null,
};

describe("ProductCard", () => {
  it("shows price and links to the product", () => {
    render(<ProductCard p={base} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/products/x");
    expect(screen.getByText("₹9,500")).toBeInTheDocument();
    expect(screen.getByAltText("Test Silk saree")).toBeInTheDocument();
  });
  it("flags sold-out and low-stock items", () => {
    const { rerender } = render(<ProductCard p={{ ...base, in_stock: false, stock: 0 }} />);
    expect(screen.getAllByText("Sold out").length).toBeGreaterThan(0);
    rerender(<ProductCard p={{ ...base, stock: 2, low_stock: true }} />);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });
});

function CartCount() {
  const { count } = useCart();
  return <output data-testid="count">{count}</output>;
}

describe("AddToCart", () => {
  beforeEach(() => localStorage.clear());

  it("adds the chosen quantity, capped by stock, and persists it", async () => {
    const user = userEvent.setup();
    render(
      <CartProvider>
        <AddToCart productId={7} stock={2} name="Test Silk" />
        <CartCount />
      </CartProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Increase quantity" }));
    expect(screen.getByRole("button", { name: "Increase quantity" })).toBeDisabled(); // stock limit 2
    await user.click(screen.getByRole("button", { name: "Add to cart" }));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(JSON.parse(localStorage.getItem("vm_cart_v1") ?? "[]")).toEqual([{ product_id: 7, quantity: 2 }]);
    expect(screen.getByRole("button", { name: "Maximum in cart" })).toBeDisabled();
  });

  it("shows a sold-out message instead of a buy button", () => {
    render(
      <CartProvider>
        <AddToCart productId={7} stock={0} name="Test Silk" />
      </CartProvider>,
    );
    expect(screen.getByText(/sold out/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to cart" })).toBeNull();
  });

  it("restores a persisted cart after reload", () => {
    localStorage.setItem("vm_cart_v1", JSON.stringify([{ product_id: 3, quantity: 4 }]));
    render(
      <CartProvider>
        <CartCount />
      </CartProvider>,
    );
    expect(screen.getByTestId("count")).toHaveTextContent("4");
  });
});
