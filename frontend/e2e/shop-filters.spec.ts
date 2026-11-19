import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const FILTERED = "/shop?category=Soft+Silk&color=Ivory&min=5000&max=20000&in_stock=true&sort=price_asc";

async function openSheet(page: Page) {
  const toggle = page.getByRole("button", { name: /Filters & sort/ });
  if (await toggle.isVisible()) await toggle.click();
}
async function openGroup(page: Page, group: string) {
  await page.locator("summary", { hasText: group }).click();
}

test("a filtered URL shows an accurate count and one removable chip per filter", async ({ page }) => {
  await page.goto(FILTERED);
  const chips = page.getByTestId("active-filters").getByRole("listitem");
  await expect(chips).toHaveText([/^Soft Silk\s*×$/, /^Ivory\s*×$/, /^From ₹5,000\s*×$/, /^Up to ₹20,000\s*×$/, /^In stock only\s*×$/]);
  // Malli Soft Silk Ivory (₹9,400) is the only demo saree matching all of these.
  await expect(page.getByTestId("result-count")).toHaveText("1 saree");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await expect(page.getByTestId("product-card")).toContainText("Malli Soft Silk Ivory");
});

test("chips remove one filter at a time and browser back/forward restore the previous state", async ({ page }) => {
  await page.goto(FILTERED);
  await page.getByRole("link", { name: "Remove filter: Ivory" }).click();
  await expect(page).not.toHaveURL(/color=/);
  await expect(page).toHaveURL(/category=Soft\+Silk/);
  await expect(page.getByTestId("active-filters").getByRole("listitem")).toHaveCount(4);

  await page.goBack();
  await expect(page).toHaveURL(/color=Ivory/);
  await expect(page.getByTestId("active-filters").getByRole("listitem")).toHaveCount(5);
  await expect(page.getByTestId("result-count")).toHaveText("1 saree");

  await page.goForward();
  await expect(page).not.toHaveURL(/color=/);

  await page.getByRole("link", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByTestId("active-filters")).toHaveCount(0);
});

test("form controls reflect the URL after back/forward (URL is the source of truth)", async ({ page }) => {
  await page.goto("/shop");
  await page.goto(FILTERED);
  await page.goBack();
  await openSheet(page);
  await expect(page.getByLabel("Sort")).toHaveValue("featured");
  await page.goForward();
  await openSheet(page);
  await expect(page.getByLabel("Sort")).toHaveValue("price_asc");
});

test("changing a filter resets pagination and keeps the other params", async ({ page, isMobile }) => {
  await page.goto("/shop?page=2&sort=price_desc");
  await expect(page.getByText("Page 2 of 2")).toBeVisible();
  await openSheet(page);
  await openGroup(page, "Fabric");
  await page.getByRole("checkbox", { name: "Soft Silk" }).check();
  if (isMobile) await page.getByRole("button", { name: "Show results" }).click();
  await expect(page).toHaveURL(/category=Soft\+Silk/);
  await expect(page).toHaveURL(/sort=price_desc/);
  await expect(page).not.toHaveURL(/page=/);
});

test("desktop applies a change immediately; mobile stages it until 'Show results'", async ({ page, isMobile }) => {
  await page.goto("/shop");
  await openSheet(page);
  await openGroup(page, "Fabric");
  await page.getByRole("checkbox", { name: "Handloom Cotton" }).check();
  if (isMobile) {
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/category=/); // staged only
    await page.getByRole("button", { name: "Show results" }).click();
  }
  await expect(page).toHaveURL(/category=Handloom\+Cotton/);
  // other specs may add catalogue items, so assert relative to what is shown rather than a fixed total
  const cards = page.getByTestId("product-card");
  await expect(cards.first()).toContainText("Handloom Cotton");
  const shown = await cards.count();
  await expect(page.getByTestId("result-count")).toHaveText(`${shown} ${shown === 1 ? "saree" : "sarees"}`);
  for (const text of await cards.allTextContents()) expect(text).toContain("Handloom Cotton");
  if (isMobile) {
    // the sheet collapses after applying; the toggle shows how many filters are active
    await expect(page.getByRole("button", { name: /Filters & sort \(1\)/ })).toBeVisible();
  }
  await page.getByTestId("active-filters").getByRole("link", { name: "Clear all" }).click();
  await expect(page).toHaveURL(/\/shop$/);
});

test("price range applies on submit and shows in chips", async ({ page }) => {
  await page.goto("/shop");
  await openSheet(page);
  await openGroup(page, "Price");
  await page.getByLabel("Minimum price in rupees").fill("20000");
  await page.getByLabel("Maximum price in rupees").fill("30000");
  await page.getByLabel("Maximum price in rupees").press("Enter");
  await expect(page).toHaveURL(/min=20000&max=30000/);
  await expect(page.getByTestId("active-filters")).toContainText("From ₹20,000");
  await expect(page.getByTestId("active-filters")).toContainText("Up to ₹30,000");
  await expect(page.getByTestId("product-card").first()).toBeVisible();
  const prices = await page.getByTestId("product-card").locator("p >> text=/^₹/").allTextContents();
  expect(prices.length).toBeGreaterThan(0);
  for (const price of prices) {
    const n = Number(price.replace(/[₹,]/g, "").match(/^\d+/)![0]);
    expect(n).toBeGreaterThanOrEqual(20000);
    expect(n).toBeLessThanOrEqual(30000);
  }
});

test("result count names the collection and the search term", async ({ page }) => {
  await page.goto("/collections/kanchipuram-silks");
  await expect(page.getByTestId("result-count")).toHaveText("4 sarees in Kanchipuram Silk");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Kanchipuram Silk");
  await page.goto("/shop?q=ivory");
  await expect(page.getByTestId("result-count")).toHaveText(/\d+ sarees? matching “ivory”/);
  await page.goto("/collections/kanchipuram-silks?q=red");
  await expect(page.getByTestId("result-count")).toHaveText(/in Kanchipuram Silk matching “red”/);
});

test("cards: portrait image, real subtitle, stock notes and a decorative second image", async ({ page }) => {
  await page.goto("/shop");
  const first = page.getByTestId("product-card").first();
  await expect(first).toContainText("Meenakshi Maroon Kanchipuram");
  await expect(first).toContainText("Maroon · Kanchipuram Silk");
  const imgs = first.locator("img");
  await expect(imgs).toHaveCount(2);
  await expect(imgs.nth(1)).toHaveAttribute("alt", "");
  await expect(imgs.nth(1)).toHaveAttribute("aria-hidden", "true");
  const box = await imgs.first().boundingBox();
  expect(box!.height / box!.width).toBeGreaterThan(1.25); // tall portrait
  await expect(page.getByTestId("product-card").filter({ hasText: "Only 2 left" })).toHaveCount(1);
  // no certification marks anywhere on the listing
  await expect(page.getByText(/silk mark|handloom mark|certified/i)).toHaveCount(0);
});

test("the single editorial note sits after the products, only on the unfiltered first page", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByText("Drawn, not woven.")).toHaveCount(1);
  await expect(page.getByTestId("product-card")).toHaveCount(12);
  // it is the last list item, after every product card
  const lastItem = page.getByRole("list", { name: "Sarees" }).locator("> li").last();
  await expect(lastItem).toContainText("Drawn, not woven.");
  await expect(lastItem.getByTestId("product-card")).toHaveCount(0);
  await page.goto("/shop?page=2");
  await expect(page.getByText("Drawn, not woven.")).toHaveCount(0);
  await page.goto("/shop?color=Ivory");
  await expect(page.getByText("Drawn, not woven.")).toHaveCount(0);
});

test("desktop popovers: one open at a time, Escape closes and returns focus", async ({ page, isMobile }) => {
  test.skip(isMobile, "popovers are a desktop pattern");
  await page.goto("/shop");
  await openGroup(page, "Fabric");
  await expect(page.getByRole("checkbox", { name: "Soft Silk" })).toBeVisible();
  await openGroup(page, "Colour");
  await expect(page.getByRole("checkbox", { name: "Soft Silk" })).toBeHidden();
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(page.locator("summary", { hasText: "Colour" })).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "Ivory" })).toBeHidden();
});

test.describe("without JavaScript", () => {
  test.use({ javaScriptEnabled: false });
  test("the filter form still works as a plain GET form (desktop layout)", async ({ page, isMobile }) => {
    test.skip(isMobile, "the narrow-screen sheet toggle needs JavaScript");
    await page.goto("/shop");
    await page.locator("summary", { hasText: "Fabric" }).click(); // native <details>
    await page.getByRole("checkbox", { name: "Soft Silk" }).check();
    await page.getByRole("button", { name: "Apply" }).first().click();
    await expect(page).toHaveURL(/\/shop\?.*category=Soft\+Silk/);
    await expect(page.getByTestId("result-count")).toHaveText("3 sarees");
    await expect(page.getByTestId("active-filters")).toContainText("Soft Silk");
  });
});
