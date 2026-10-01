import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("donor dashboard uses kit tables and pill CTA", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor");
  await expect(page.locator(".donor-dashboard-cta")).toHaveCSS("border-radius", "999px");
  await expect(page.locator("[data-request-board-panel]")).toHaveCSS("background-color", "rgb(16, 199, 154)");
  const rows = page.locator(".ops-table-row-clickable");
  if ((await rows.count()) > 0) {
    await rows.first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden();
  } else {
    await expect(page.getByText(/no incoming requests/i)).toBeVisible();
  }
});
