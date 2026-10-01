import { expect, test } from "@playwright/test";

test("tokens are defined on :root", async ({ page }) => {
  await page.goto("/auth");
  const mint = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--ll-mint").trim().toLowerCase(),
  );
  expect(mint).toBe("#10c79a");
});

test("legacy palette variables no longer exist", async ({ page }) => {
  await page.goto("/auth");
  const forest = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--forest").trim(),
  );
  expect(forest).toBe("");
});

test("display headings use Playfair Display", async ({ page }) => {
  await page.goto("/listings");
  // With no backend the catalog renders its empty state, whose heading may be h1 or h2.
  const family = await page.locator("h1, h2").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Playfair/i);
});
