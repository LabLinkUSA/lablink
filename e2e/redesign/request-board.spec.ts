import { expect, test } from "@playwright/test";

import { loginAs } from "../helpers/auth";
import { assertNoHorizontalScroll, backendUp } from "./helpers";

test.beforeEach(async () => {
  test.skip(!(await backendUp()), "backend not running");
});

test("board posts render as cards", async ({ page }) => {
  await loginAs(page, "donor");
  await page.goto("/donor/request-board");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Request Board");
  const cards = page.locator("[data-board-card]");
  if ((await cards.count()) > 0) {
    await expect(cards.first()).toHaveCSS("border-radius", "24px");
    await expect(cards.first().getByRole("button", { name: /respond with listing/i })).toHaveCSS("border-radius", "999px");
  } else {
    await expect(page.locator("[data-board-empty]")).toBeVisible();
  }
  await assertNoHorizontalScroll(page);
});
