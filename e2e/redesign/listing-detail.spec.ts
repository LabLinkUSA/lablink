import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll, backendUp } from "./helpers";

test("listing detail hero and fact tiles", async ({ page }) => {
  test.skip(!(await backendUp()), "needs backend with a live listing");
  await page.goto("/listings");
  const first = page.locator("[data-listing-card] a").first();
  test.skip((await first.count()) === 0, "no live listings");
  await first.click();
  await expect(page.locator("[data-detail-media]")).toHaveCSS("border-radius", "24px");
  await expect(page.getByRole("heading", { name: "Technical overview" })).toBeVisible();
  await expect(page.locator("[data-fact-tile]")).toHaveCount(6);
  await assertNoHorizontalScroll(page);
});

test("unknown listing returns not found", async ({ page }) => {
  const response = await page.goto("/listings/00000000-0000-0000-0000-000000000000");
  expect(response?.status()).toBe(404);
});
