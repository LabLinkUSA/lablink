import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test.describe("ui kit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dev/kit");
  });

  test("primary button is a mint pill", async ({ page }) => {
    const button = page.getByRole("button", { name: "Primary action" });
    await expect(button).toHaveCSS("border-radius", "999px");
    await expect(button).toHaveCSS("background-color", "rgb(16, 199, 154)");
  });

  test("status pills map to tone groups", async ({ page }) => {
    await expect(page.locator(".status-pill.status-live")).toHaveAttribute("data-tone", "positive");
    await expect(page.locator(".status-pill.status-admin_review")).toHaveAttribute("data-tone", "pending");
    await expect(page.locator(".status-pill.status-matched_reserved")).toHaveAttribute("data-tone", "neutral");
    await expect(page.locator(".status-pill.status-rejected_cancelled")).toHaveAttribute("data-tone", "negative");
  });

  test("field error is announced", async ({ page }) => {
    const input = page.locator("#kit-error-input");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", "kit-error-input-error");
    await expect(page.locator("#kit-error-input-error")).toHaveText("This field is required.");
  });

  test("modal opens from keyboard, closes on Escape, restores focus", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open modal" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("dialog", { name: "Kit modal" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Kit modal" })).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("empty data table renders its empty state", async ({ page }) => {
    await expect(page.getByText("Nothing here yet")).toBeVisible();
  });

  test("long text never causes page overflow", async ({ page }) => {
    await assertNoHorizontalScroll(page);
  });
});

test("reveal content is visible under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/dev/kit");
  await expect(page.getByTestId("kit-reveal-below-fold")).toHaveCSS("opacity", "1");
  await context.close();
});

test("reveal content is visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/dev/kit");
  await expect(page.getByTestId("kit-reveal-below-fold")).toHaveCSS("opacity", "1");
  await context.close();
});
