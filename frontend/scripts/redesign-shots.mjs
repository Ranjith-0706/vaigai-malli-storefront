// Before/after screenshots for the redesign review.
// Usage: node scripts/redesign-shots.mjs <before|after> [outDir]   (web on :3000 + API running)
import { chromium } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const label = process.argv[2] ?? "after";
const OUT = process.argv[3] ?? path.resolve("../docs/screenshots/redesign");
fs.mkdirSync(OUT, { recursive: true });

const viewports = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1100 },
  mobile: { width: 390, height: 844 },
};

const browser = await chromium.launch();
for (const [name, viewport] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: name === "mobile" ? 2 : 1, isMobile: name === "mobile" });
  const page = await ctx.newPage();
  const shot = async (file, full = false) => {
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(OUT, `${label}-${name}-${file}.png`), fullPage: full });
    console.log("saved", `${label}-${name}-${file}`);
  };
  const tablet = name === "tablet";

  await page.goto(BASE + "/shop");
  await shot("shop-fold");
  if (!tablet) await shot("shop-full", true);
  if (label === "after") {
    // open filter UI: desktop popover / mobile sheet
    if (name !== "desktop") await page.getByRole("button", { name: /Filters & sort/ }).click();
    else await page.locator("summary", { hasText: "Colour" }).click();
    await shot("shop-filter-open");
  }
  await page.goto(BASE + "/shop?category=Soft+Silk&color=Ivory&sort=price_asc");
  await shot("shop-filtered");
  await page.goto(BASE + "/shop?q=zzzz");
  await shot("shop-empty");
  if (tablet) { await ctx.close(); continue; }
  await page.goto(BASE + "/collections/kanchipuram-silks");
  await shot("collection");
  await page.goto(BASE + "/products/thodarkodi-jasmine-ivory");
  await shot("product", true);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto(BASE + "/checkout");
  await page.getByTestId("ship-flat").waitFor();
  await shot("checkout", true);
  await ctx.close();
}
await browser.close();
