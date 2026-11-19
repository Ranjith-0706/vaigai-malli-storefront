// Captures representative desktop + mobile screenshots into docs/screenshots.
// Usage: node scripts/screenshots.mjs [outDir]   (needs web on :3000 and API running)
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = process.argv[2] ?? path.resolve("../docs/screenshots");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
fs.mkdirSync(OUT, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: name === "mobile" ? 2 : 1, isMobile: name === "mobile" });
  const page = await ctx.newPage();
  const shot = async (file, opts = {}) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${name}-${file}.png`), fullPage: opts.full ?? false });
    console.log("saved", `${name}-${file}`);
  };

  await page.goto(BASE + "/");
  await shot("01-home");
  await page.goto(BASE + "/");
  await shot("01b-home-full", { full: true });
  await page.goto(BASE + "/shop");
  await shot("02-shop");
  await page.goto(BASE + "/shop?category=Soft+Silk&color=Ivory&sort=price_asc");
  await shot("03-shop-filtered");
  await page.goto(BASE + "/shop?q=zzzz");
  await shot("04-shop-empty");
  await page.goto(BASE + "/products/thodarkodi-jasmine-ivory");
  await shot("05-product");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto(BASE + "/cart");
  await page.getByTestId("cart-line").first().waitFor();
  await shot("06-cart");
  await page.goto(BASE + "/checkout");
  await page.getByTestId("ship-flat").waitFor();
  await shot("07-checkout", { full: true });
  await page.goto(BASE + "/about");
  await shot("08-about");

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await page.goto(BASE + "/admin/login");
    await shot("09-admin-login");
    await page.getByLabel("Email").fill(ADMIN_EMAIL);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("heading", { name: "Dashboard" }).waitFor();
    await shot("10-admin-dashboard", { full: true });
    await page.goto(BASE + "/admin/orders");
    await page.getByTestId("order-row").first().waitFor();
    await shot("11-admin-orders");
    await page.getByTestId("order-row").first().getByRole("link").click();
    await page.getByTestId("admin-order-status").waitFor();
    await shot("12-admin-order-detail", { full: true });
    await page.goto(BASE + "/admin/products");
    await shot("13-admin-products");
  }
  await ctx.close();
}
await browser.close();
