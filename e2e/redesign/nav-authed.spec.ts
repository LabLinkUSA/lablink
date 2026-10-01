import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running (make back) — authed checks skipped");
});

test("signed-in donor on / sees role links, bell, avatar menu", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout");
  await loginAs(page, "donor");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /notifications/i })).toBeVisible();
  const avatar = page.getByRole("button", { name: /account menu/i });
  await avatar.press("Enter");
  await expect(page.getByRole("menuitem", { name: "Log out" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(avatar).toBeFocused();
});

test("empty notification panel shows a designed empty state", async ({ page, isMobile }) => {
  test.skip(isMobile, "desktop layout");
  await loginAs(page, "recipient");
  await page.goto("/recipient");
  await page.getByRole("button", { name: /notifications/i }).click();
  const panel = page.getByRole("dialog", { name: /notifications/i });
  await expect(panel).toBeVisible();
  await expect(panel.locator("[data-empty], [data-has-items]")).toHaveCount(1);
});
