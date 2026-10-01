import { expect, test } from "@playwright/test";

import { assertNoHorizontalScroll } from "./helpers";

test("signed-out homepage nav shows Mission, Team, Sign in", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile covered below");
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Mission" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Team" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth");
});

test("signed-out nav off the homepage shows Home, Donate, Sign in", async ({ page, isMobile }) => {
  test.skip(isMobile, "mobile covered below");
  await page.goto("/listings");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Donate" })).toHaveAttribute("href", "/auth");
  await expect(nav.getByRole("link", { name: "Browse" })).toHaveCount(0);
});

test("mobile menu opens from keyboard and closes on Escape", async ({ page, isMobile }) => {
  test.skip(!isMobile, "mobile only");
  await page.goto("/listings");
  const toggle = page.getByRole("button", { name: "Menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Donate" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
  await assertNoHorizontalScroll(page);
});

test("footer is the homepage footer", async ({ page }) => {
  await page.goto("/listings");
  await expect(page.getByText("A Yale nonprofit · New Haven, CT · Founded 2024")).toBeVisible();
});
