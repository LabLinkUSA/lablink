import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Admin institution verification: admin logs in, opens the verification
 * queue, selects a pending institution, and approves it.
 *
 * Prerequisites:
 * - E2E admin test user pre-created in Supabase (auto-provisioned via allowlist)
 * - At least one institution with verification_status = "pending_verification"
 *   must exist in the database
 */

test.describe("Admin Institution Verification", () => {
  test("admin verifies a pending institution", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin");

    // The admin dashboard loads with a sidebar and queue sections.
    // Find a pending institution row in the verification table.
    const pendingRow = page.locator(".ops-table-row-clickable").filter({
      has: page.getByText(/pending/i),
    }).first();

    // If no pending institution exists, skip gracefully
    const hasPending = await pendingRow.isVisible({ timeout: 10_000 }).catch(() => false);
    if (!hasPending) {
      test.skip(true, "No pending institutions in test environment");
      return;
    }

    // Capture the institution name for later verification
    const institutionName = await pendingRow.locator("td").first().textContent();

    // Click to open the review modal
    await pendingRow.click();

    // In the modal, select "Verify institution" and submit
    const statusSelect = page.locator("select[name='verificationStatus']");
    await expect(statusSelect).toBeVisible({ timeout: 5_000 });
    await statusSelect.selectOption("verified");
    await page.getByRole("button", { name: /update status/i }).click();

    // Verify the modal closes after successful update
    await expect(statusSelect).not.toBeVisible({ timeout: 10_000 });

    // The institution should no longer appear as pending in the queue
    if (institutionName) {
      const updatedRow = page.locator(".ops-table-row-clickable").filter({
        hasText: institutionName,
      });
      // Either the row is gone or its status pill no longer says "pending"
      const stillVisible = await updatedRow.isVisible({ timeout: 3_000 }).catch(() => false);
      if (stillVisible) {
        await expect(updatedRow.getByText(/pending/i)).not.toBeVisible();
      }
    }
  });
});
