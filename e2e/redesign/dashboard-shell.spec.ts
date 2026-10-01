import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

for (const [user, path] of [["donor", "/donor"], ["recipient", "/recipient"], ["admin", "/admin"]] as const) {
  test(`${path} uses the shared ink rail and stat tiles`, async ({ page, isMobile }) => {
    test.skip(!(await backendUp()), "backend not running");
    await loginAs(page, user);
    await page.goto(path);
    if (!isMobile) {
      await expect(page.locator("[data-dashboard-rail]")).toHaveCSS("background-color", "rgb(15, 38, 33)");
    } else {
      await expect(page.locator("[data-dashboard-tabs]")).toBeVisible();
    }
    await expect(page.locator("[data-stat-tile]").first()).toBeVisible();
    await assertNoHorizontalScroll(page);
  });
}

test("signed-out /donor shows a gate card", async ({ page }) => {
  await page.goto("/donor");
  await expect(page.locator("[data-gate]")).toBeVisible();
  await expect(page.locator("[data-gate] h1")).toHaveCount(1);
});
