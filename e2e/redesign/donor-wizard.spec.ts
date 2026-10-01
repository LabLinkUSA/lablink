import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("wizard keeps contract selectors and new step styling", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor/list-equipment");
  for (const id of ["title", "category", "condition", "quantity", "window", "working-status", "description"]) {
    await expect(page.locator(`#listing-${id}`)).toBeVisible();
  }
  await expect(page.locator("button.donor-form-primary-action")).toHaveCSS("border-radius", "999px");
  await expect(page.locator("[data-step-card]").first()).toHaveCSS("border-radius", "24px");
  await expect(page.locator("[data-step-pill][aria-current='step']")).toHaveCount(1);
  await assertNoHorizontalScroll(page);
});
