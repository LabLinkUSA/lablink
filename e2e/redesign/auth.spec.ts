import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

for (const path of ["/auth", "/auth/sign-up"]) {
  test(`${path} uses the split layout and keeps the E2E contract`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("[data-auth-aside]")).toHaveCSS("background-color", "rgb(20, 48, 42)");
    await expect(page.locator("[data-auth-card]")).toHaveCSS("border-radius", "24px");
    await assertNoHorizontalScroll(page);
  });
}

test("sign-in contract selectors resolve", async ({ page }) => {
  await page.goto("/auth");
  await expect(page.locator("#sign-in-email")).toBeVisible();
  await expect(page.locator("#sign-in-password")).toBeVisible();
  const submit = page.locator("button.auth-screen-primary-button");
  await expect(submit).toHaveCSS("border-radius", "999px");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
});

test("sign-up pairs are two-column on desktop and collapse on mobile", async ({ page, isMobile }) => {
  await page.goto("/auth/sign-up");
  for (const [a, b] of [
    ["#sign-up-password", "#confirm-password"],
    ["#role", "#institution-location"],
  ]) {
    const first = await page.locator(a).boundingBox();
    const second = await page.locator(b).boundingBox();
    if (isMobile) {
      expect(second!.y).toBeGreaterThan(first!.y);
    } else {
      expect(second!.y).toBeCloseTo(first!.y, 0);
      expect(second!.x).toBeGreaterThan(first!.x);
    }
  }
});
