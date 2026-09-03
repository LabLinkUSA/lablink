import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Recipient request board: recipient logs in, submits a new equipment
 * request to the board, and verifies it appears on their dashboard.
 *
 * Prerequisites:
 * - E2E recipient test user pre-created in Supabase
 * - Recipient's institution must be admin-verified
 */

const POST_TITLE = `E2E Need Microscope ${Date.now()}`;

test.describe("Recipient Request Board", () => {
  test("recipient submits a request board post", async ({ page }) => {
    await loginAs(page, "recipient");
    await page.goto("/recipient");

    // Find and click the "Post Equipment Request" or similar button/link
    const postLink = page.getByRole("link", { name: /post.*request|request.*equipment/i });
    if (await postLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await postLink.click();
    } else {
      // Try navigating directly if the link isn't on the dashboard
      await page.goto("/recipient");
    }

    // Fill the request board form
    await page.locator("#board-title").fill(POST_TITLE);
    await page.locator("#board-category").fill("Microscopes");
    await page.locator("#board-description").fill(
      "Need a fluorescence microscope for cell biology teaching lab. " +
      "Must support DAPI and GFP filter sets. Automated E2E test post."
    );
    await page.locator("#board-intended-use").fill(
      "Undergraduate cell biology laboratory course — students will use " +
      "the microscope for live cell imaging and fixed tissue observation."
    );
    await page.locator("#board-quantity").fill("1");
    await page.locator("#board-needed-by").fill("2027-03-01");
    await page.locator("#board-location").fill("Cambridge, MA");

    // Submit the request
    await page.getByRole("button", { name: /submit request/i }).click();

    // Verify success — the post should appear in the recipient's dashboard
    // or we should see a success message / redirect
    await expect(
      page.getByText(POST_TITLE).or(page.getByText(/submitted|success/i))
    ).toBeVisible({ timeout: 10_000 });
  });
});
