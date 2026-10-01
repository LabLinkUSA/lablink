import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("admin sections use filter bars and kit tables", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin");
  await expect(page.locator("[data-filter-bar]")).toHaveCount(4);
  await expect(page.locator("[data-filter-bar] input[type='search']").first()).toHaveCSS("border-radius", "999px");
  await assertNoHorizontalScroll(page);
});

test("institution review modal keeps contract", async ({ page }) => {
  await loginAs(page, "admin");
  await page.goto("/admin");
  const row = page.locator("#institution-verification .ops-table-row-clickable").first();
  test.skip((await row.count()) === 0, "no institutions");
  await row.press("Enter");
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("select[name='verificationStatus']")).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: /update status/i })).toHaveCSS("border-radius", "999px");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
