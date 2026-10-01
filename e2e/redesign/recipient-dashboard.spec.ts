import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("new request form is styled and keeps board ids", async ({ page }) => {
  await loginAs(page, "recipient");
  await page.goto("/recipient");
  await page.getByRole("button", { name: /new request/i }).click();
  for (const id of ["title", "category", "description", "intended-use", "quantity", "needed-by", "location"]) {
    await expect(page.locator(`#board-${id}`)).toBeVisible();
  }
  await expect(page.locator("#board-title")).toHaveCSS("border-radius", "12px");
  await expect(page.getByRole("button", { name: /submit request/i })).toHaveCSS("border-radius", "999px");
});
