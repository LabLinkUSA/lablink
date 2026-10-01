import { expect, type Page } from "@playwright/test";

export async function hideDevIndicator(page: Page) {
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
}

export async function gotoSettled(page: Page, path: string) {
  await page.goto(path, { waitUntil: "load" });
  await hideDevIndicator(page);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 300) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(80);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2500);
}

export async function assertNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "page must not scroll horizontally").toBeLessThanOrEqual(0);
}

export async function backendUp(): Promise<boolean> {
  const base = process.env.E2E_API_URL || "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${base}/docs`, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}
