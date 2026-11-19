import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "e2e-admin@example.com";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "e2e-only-password-123";

async function login(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function placePaidOrder(request: APIRequestContext, email: string) {
  const products = await (await request.get("/api/v1/products?q=Mango")).json();
  const pid = products.items[0].id;
  const order = await (
    await request.post("/api/v1/checkout/orders", {
      data: {
        items: [{ product_id: pid, quantity: 1 }],
        contact: { name: "Priya Subramanian", email, phone: "9876543210" },
        address: { line1: "4 Gandhi Road", city: "Chennai", state: "Tamil Nadu", pincode: "600001" },
        shipping_method: "flat",
      },
    })
  ).json();
  const pay = await request.post(`/api/v1/orders/${order.reference}/pay`, { data: { email, attempt_key: `e2e-${order.reference}`, demo_outcome: "success" } });
  expect(pay.ok()).toBeTruthy();
  return order.reference as string;
}

test("admin area is protected and rejects bad credentials", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  expect((await request.get("/api/v1/admin/dashboard")).status()).toBe(401); // enforced by the API, not the UI

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByTestId("login-error")).toContainText("Incorrect email or password");
});

test("admin journey: sign in, fulfil an order through each status with tracking", async ({ page, request }) => {
  const email = `admin-flow-${Date.now()}@example.com`;
  const ref = await placePaidOrder(request, email);

  await login(page);
  await page.goto("/admin/orders");
  await page.getByLabel(/Search orders/).fill(ref);
  await page.getByRole("button", { name: "Search" }).click();
  await expect(page.getByTestId("order-row")).toHaveCount(1);
  await page.getByRole("link", { name: ref }).click();
  await expect(page.getByTestId("admin-order-status")).toHaveText("Order received");

  await page.getByTestId("transition-confirmed").click();
  await expect(page.getByTestId("admin-order-status")).toHaveText("Confirmed");
  await page.getByTestId("transition-packed").click();
  await expect(page.getByTestId("admin-order-status")).toHaveText("Packed");

  // cannot ship without a tracking reference
  await page.getByTestId("transition-shipped").click();
  await expect(page.getByTestId("admin-msg")).toContainText("tracking reference");
  await expect(page.getByTestId("admin-order-status")).toHaveText("Packed");

  await page.getByLabel(/Tracking reference/).fill("DTDC-E2E-12345");
  await page.getByTestId("transition-shipped").click();
  await expect(page.getByTestId("admin-order-status")).toHaveText("Shipped");

  await page.getByLabel("Internal fulfilment notes").fill("Packed with silk wrap");
  await page.getByRole("button", { name: /Save notes/ }).click();
  await expect(page.getByTestId("admin-msg")).toContainText("saved");

  await page.getByTestId("transition-delivered").click();
  await expect(page.getByTestId("admin-order-status")).toHaveText("Delivered");
  await expect(page.getByTestId("transition-cancelled")).toHaveCount(0); // terminal state

  // the customer sees the result
  const lookup = await (await request.post("/api/v1/orders/lookup", { data: { reference: ref, email } })).json();
  expect(lookup.status).toBe("delivered");
  expect(lookup.tracking_reference).toBe("DTDC-E2E-12345");
});

test("admin can edit a product and the storefront reflects price, stock and archiving", async ({ page }) => {
  await login(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "Pavalam Coral Cotton" }).click();
  await expect(page.getByRole("heading", { name: "Edit product" })).toBeVisible();
  await page.getByLabel("Price (₹)").fill("3450");
  await page.getByLabel("Stock on hand").fill("2");
  await page.getByTestId("save-product").click();
  await expect(page.getByTestId("product-saved")).toBeVisible();

  await page.goto("/products/pavalam-coral-cotton");
  await expect(page.getByText("₹3,450").first()).toBeVisible();
  await expect(page.getByTestId("stock-status")).toContainText("Only 2 left");

  // archive hides it from the shop
  await page.goto("/admin/products");
  await page.getByRole("button", { name: "Archive Pavalam Coral Cotton" }).click();
  await expect(page.getByText(/archived \(hidden from the shop\)/)).toBeVisible();
  expect((await page.goto("/products/pavalam-coral-cotton"))?.status()).toBe(404);

  // create a new product
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill("E2E Test Saree");
  await page.getByLabel("Fabric").fill("Test silk");
  await page.getByLabel("Colour name").fill("Maroon");
  await page.getByLabel("Price (₹)").fill("8800");
  await page.getByLabel("Stock on hand").fill("4");
  await page.getByTestId("save-product").click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  await expect(page.getByRole("link", { name: "E2E Test Saree" })).toBeVisible();
  const res = await page.goto("/products/e2e-test-saree");
  expect(res?.status()).toBe(200);
});
