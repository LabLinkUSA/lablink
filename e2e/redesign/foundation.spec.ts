import { expect, test } from "@playwright/test";

test("tokens are defined on :root", async ({ page }) => {
  await page.goto("/auth");
  const mint = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--ll-mint").trim().toLowerCase(),
  );
  expect(mint).toBe("#10c79a");
});

test("legacy variables are remapped to the new palette", async ({ page }) => {
  await page.goto("/auth");
  const forest = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--forest").trim().toLowerCase(),
  );
  expect(forest).toBe("#14302a");
});

test("display headings use Playfair Display", async ({ page }) => {
  await page.goto("/listings");
  // With no backend the catalog renders its empty state, whose heading may be h1 or h2.
  const family = await page.locator("h1, h2").first().evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family).toMatch(/Playfair/i);
});
