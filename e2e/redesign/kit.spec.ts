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

  test("stat tile count-up ends at its final value", async ({ page }) => {
    await expect(page.locator("[data-stat-tile]").first().locator("div").first()).toHaveText("12", { timeout: 5000 });
  });

  test("pill uses kit styling over legacy rules", async ({ page }) => {
    const pill = page.locator(".status-pill.status-removed_by_admin");
    await expect(pill).toHaveCSS("border-radius", "999px");
    await expect(pill).toHaveCSS("background-color", "rgba(196, 64, 52, 0.12)");
  });

  test("modal close button calls onClose exactly once", async ({ page }) => {
    await page.getByRole("button", { name: "Open modal" }).click();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByTestId("kit-modal-close-count")).toHaveText("1");
  });

  test("field error is announced", async ({ page }) => {
    const input = page.locator("#kit-error-input");
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAttribute("aria-describedby", "kit-error-input-error");
    await expect(input).toHaveCSS("border-top-color", "rgb(140, 42, 32)");
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

  test("non-dismissible modal ignores Escape and disables close", async ({ page }) => {
    await page.getByRole("button", { name: "Open locked modal" }).click();
    const dialog = page.getByRole("dialog", { name: "Locked modal" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Close", exact: true })).toBeDisabled();
    await dialog.getByRole("button", { name: "Unlock and close" }).click();
    await expect(dialog).toBeHidden();
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

test("stat tile shows its final value immediately under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/dev/kit");
  await expect(page.locator("[data-stat-tile]").first().locator("div").first()).toHaveText("12", { timeout: 300 });
  await context.close();
});

test.describe("kit on real pages", () => {
  test("auth primary button is a mint pill", async ({ page }) => {
    await page.goto("/auth");
    const button = page.locator("button.auth-screen-primary-button");
    await expect(button).toHaveCSS("border-radius", "999px");
    await expect(button).toHaveCSS("background-color", "rgb(16, 199, 154)");
  });

  test("auth field control is a 12px-radius input without legacy global theming", async ({ page }) => {
    await page.goto("/auth");
    const input = page.locator("#sign-in-email");
    await expect(input).toHaveCSS("border-radius", "12px");
    await expect(input).toHaveCSS("border-top-color", "rgba(20, 48, 42, 0.3)");
  });
});
