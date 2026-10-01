import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

for (const path of ["/auth/forgot-password", "/auth/update-password"]) {
  test(`${path} renders in a centered card`, async ({ page }) => {
    await page.goto(path);
    const card = page.locator("[data-centered-card]");
    await expect(card).toHaveCSS("border-radius", "24px");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await assertNoHorizontalScroll(page);
  });
}

test("forgot-password submit is a pill", async ({ page }) => {
  await page.goto("/auth/forgot-password");
  await expect(page.getByRole("button", { name: /send|reset/i })).toHaveCSS("border-radius", "999px");
});
