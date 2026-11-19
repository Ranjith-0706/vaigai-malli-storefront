import { expect, test, type Page } from "@playwright/test";

async function openFilters(page: Page) {
  const toggle = page.getByRole("button", { name: /Filters & sort/ });
  if (await toggle.isVisible()) await toggle.click(); // collapsed on mobile
}

async function fillCheckout(page: Page, email: string) {
  await page.getByLabel("Full name").fill("Anitha Raman");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mobile number").fill("98765 43210");
  await page.getByLabel("Address line 1").fill("12 Sannadhi Street");
  await page.getByLabel("City").fill("Madurai");
  await page.getByLabel("PIN code").fill("625001");
  await page.getByLabel("State / union territory").selectOption("Tamil Nadu");
}

test("customer journey: discover, filter, add to cart, check out, pay (demo) and track", async ({ page }) => {
  const email = `journey-${Date.now()}@example.com`;
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Temple-border silks");
  await page.getByRole("link", { name: "Shop all sarees" }).first().click();
  await expect(page).toHaveURL(/\/shop/);
  await expect(page.getByTestId("result-count")).toContainText(/\d+ sarees/);

  // filter by category (auto-submits)
  await openFilters(page);
  await page.getByRole("checkbox", { name: "Soft Silk" }).check();
  await expect(page).toHaveURL(/category=Soft\+Silk/);
  await expect(page.getByTestId("result-count")).toContainText("3 sarees");

  // open a product
  await page.getByRole("link", { name: /Malli Soft Silk Ivory/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Malli Soft Silk Ivory");
  await expect(page.getByText("₹9,400").first()).toBeVisible();
  await expect(page.getByTestId("stock-status")).toContainText("In stock");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("2");

  // cart: server-priced
  await page.goto("/cart");
  await expect(page.getByTestId("cart-line")).toHaveCount(1);
  await expect(page.getByTestId("subtotal")).toHaveText("₹18,800");
  await page.getByRole("link", { name: "Proceed to checkout" }).click();

  // checkout: invalid first, then valid
  await page.getByTestId("ship-flat").waitFor();
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page.getByTestId("form-error")).toBeVisible();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await fillCheckout(page, email);
  await expect(page.getByTestId("shipping")).toHaveText("₹150");
  await expect(page.getByTestId("total")).toHaveText("₹18,950");
  await page.getByRole("button", { name: /Place order/ }).click();

  // payment (demo)
  await expect(page).toHaveURL(/\/checkout\/payment\/VM-/);
  await expect(page.getByText("Demo payment · no money moves")).toBeVisible();
  await page.getByTestId("pay-success").click();

  // confirmation
  await expect(page.getByTestId("confirmation-heading")).toHaveText("Order confirmed");
  const ref = (await page.getByTestId("order-reference").textContent())!.trim();
  expect(ref).toMatch(/^VM-[A-Z0-9]{8}$/);
  await expect(page.getByTestId("order-total")).toHaveText("₹18,950");
  await expect(page.getByTestId("cart-count")).toHaveCount(0); // cart emptied

  // track with reference + email in a fresh browser context
  const fresh = await page.context().browser()!.newContext();
  const p2 = await fresh.newPage();
  await p2.goto(page.url().split("/order/")[0] + "/order-status");
  await p2.getByLabel("Order reference").fill(ref);
  await p2.getByLabel("Email used at checkout").fill(email);
  await p2.getByRole("button", { name: "Find my order" }).click();
  await expect(p2.getByTestId("order-reference")).toHaveText(ref);
  await expect(p2.getByText("Order received").first()).toBeVisible();

  // wrong email does not reveal the order
  const p3 = await fresh.newPage();
  await p3.goto("/order-status");
  await p3.getByLabel("Order reference").fill(ref);
  await p3.getByLabel("Email used at checkout").fill("someone-else@example.com");
  await p3.getByRole("button", { name: "Find my order" }).click();
  await expect(p3.getByTestId("lookup-error")).toContainText("could not find");
  await fresh.close();
});

test("failed demo payment keeps the order unpaid, then a retry succeeds", async ({ page }) => {
  const email = `retry-${Date.now()}@example.com`;
  await page.goto("/products/thulasi-green-silk-cotton");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await page.getByTestId("ship-flat").waitFor();
  await fillCheckout(page, email);
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/checkout\/payment\/VM-/);

  await page.getByTestId("pay-failure").click();
  await expect(page.getByTestId("payment-failure")).toContainText("Payment failed");
  await expect(page).toHaveURL(/\/checkout\/payment\//); // not confirmed

  await page.getByTestId("pay-success").click();
  await expect(page.getByTestId("confirmation-heading")).toHaveText("Order confirmed");
});

test("local pickup needs no address and costs nothing", async ({ page }) => {
  await page.goto("/products/navy-zari-check-cotton");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/checkout");
  await page.getByTestId("ship-pickup").waitFor();
  await page.getByLabel(/Local pickup/).check();
  await expect(page.getByLabel("Address line 1")).toHaveCount(0);
  await expect(page.getByTestId("shipping")).toHaveText("Free");
  await page.getByLabel("Full name").fill("Meena Sundar");
  await page.getByLabel("Email").fill(`pickup-${Date.now()}@example.com`);
  await page.getByLabel("Mobile number").fill("9876543210");
  await page.getByRole("button", { name: /Place order/ }).click();
  await expect(page).toHaveURL(/\/checkout\/payment\/VM-/);
  await page.getByTestId("pay-success").click();
  await expect(page.getByTestId("confirmation-heading")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Local pickup" })).toBeVisible();
});

test("search with no results shows a helpful empty state; sold-out items cannot be bought", async ({ page }) => {
  await page.goto("/shop?q=zzzz");
  await expect(page.getByTestId("empty-state")).toContainText("No sarees match");
  await page.getByRole("link", { name: "Clear all filters" }).click();
  await expect(page.getByTestId("result-count")).toContainText(/\d+ sarees/);

  await page.goto("/products/sandal-silk-cotton-contemporary");
  await expect(page.getByTestId("stock-status")).toContainText("Sold out");
  await expect(page.getByRole("button", { name: "Add to cart" })).toHaveCount(0);
});

test("keyboard: skip link and info pages are reachable", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  for (const path of ["/about", "/contact", "/shipping", "/returns", "/privacy", "/terms"]) {
    const res = await page.goto(path);
    expect(res?.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Sample text for a demo store").first()).toBeVisible();
  }
  expect((await page.goto("/does-not-exist"))?.status()).toBe(404);
});
