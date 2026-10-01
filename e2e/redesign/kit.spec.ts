import { expect, test } from "@playwright/test";

// The kit fixture page (/dev/kit) was removed in the final cleanup, so these
// assertions run against real pages. Anything needing listings is skipped when
// the catalog is empty (backend down or unseeded).

test("kit primary button is a mint pill", async ({ page }) => {
  await page.goto("/auth");
  const button = page.locator("button.auth-screen-primary-button");
  await expect(button).toHaveCSS("border-radius", "999px");
  await expect(button).toHaveCSS("background-color", "rgb(16, 199, 154)");
});

test("kit field control is a 12px-radius input, unaffected by legacy global rules", async ({ page }) => {
  await page.goto("/auth");
  const input = page.locator("#sign-in-email");
  await expect(input).toHaveCSS("border-radius", "12px");
  await expect(input).toHaveCSS("border-top-color", "rgba(20, 48, 42, 0.3)");
});

test("catalog status pill uses kit styling", async ({ page }) => {
  await page.goto("/listings");
  const pill = page.locator("[data-listing-card] .status-pill").first();
  test.skip((await pill.count()) === 0, "no listings → no status pill on a backend-free page");
  await expect(pill).toHaveCSS("border-radius", "999px");
  await expect(pill).toHaveAttribute("data-tone", /positive|pending|neutral|negative/);
});

test("reveal content is visible under reduced motion", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/listings");
  const reveals = page.locator("[data-reveal]");
  test.skip((await reveals.count()) === 0, "no listings → no Reveal on a backend-free page");
  await expect(reveals.last()).toHaveCSS("opacity", "1");
  await context.close();
});

test("reveal content is visible without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/listings");
  const reveals = page.locator("[data-reveal]");
  test.skip((await reveals.count()) === 0, "no listings → no Reveal on a backend-free page");
  await expect(reveals.last()).toHaveCSS("opacity", "1");
  await context.close();
});
