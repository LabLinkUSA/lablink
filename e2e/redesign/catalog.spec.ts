import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test("catalog header uses the public page header", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText("Equipment catalog", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Catalog");
  await assertNoHorizontalScroll(page);
});

test("empty catalog shows a designed empty state", async ({ page }) => {
  await page.goto("/listings");
  const cards = page.locator("[data-listing-card]");
  if ((await cards.count()) === 0) {
    await expect(page.locator("[data-catalog-empty]")).toBeVisible();
    await expect(page.locator("[data-catalog-empty] h2")).toBeVisible();
  }
});

test("category filter popover is keyboard operable", async ({ page }) => {
  await page.goto("/listings");
  const pill = page.getByRole("button", { name: /category/i });
  test.skip((await pill.count()) === 0, "no listings → no filter bar");
  await pill.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("group", { name: /category/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(pill).toBeFocused();
});
