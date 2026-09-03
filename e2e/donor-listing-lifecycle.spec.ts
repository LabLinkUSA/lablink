import path from "node:path";
import { test, expect } from "@playwright/test";
import { loginAs } from "./helpers/auth";

/**
 * Donor listing lifecycle: create draft → fill form → upload photo →
 * complete compliance PDFs → submit for review → admin approves → listing is live.
 *
 * Prerequisites:
 * - E2E test users pre-created in Supabase (donor + admin)
 * - Donor's institution must be admin-verified
 * - A test image file at e2e/fixtures/test-equipment.jpg
 * - Two test PDF files at e2e/fixtures/decontamination.pdf and e2e/fixtures/liability.pdf
 */

const LISTING_TITLE = `E2E Centrifuge ${Date.now()}`;

test.describe("Donor Listing Lifecycle", () => {
  test("donor creates listing, submits for review, admin approves", async ({ page }) => {
    // --- Step 1: Donor creates a draft and fills the 4-step wizard ---
    await loginAs(page, "donor");
    await page.goto("/donor/list-equipment");

    // Step 1: Equipment Details
    await page.locator("#listing-title").fill(LISTING_TITLE);
    await page.locator("#listing-category").fill("Centrifuge");
    await page.locator("#listing-condition").fill("Good — fully functional");
    await page.locator("#listing-quantity").fill("1");
    await page.locator("#listing-window").fill("Available immediately");
    await page.locator("#listing-working-status").fill("Fully functional, last calibrated 2026-06");
    await page.locator("#listing-description").fill(
      "Benchtop centrifuge suitable for molecular biology workflows. " +
      "Includes 24-well rotor and lid. Automated E2E test listing."
    );

    // Advance to step 2
    await page.locator("button.donor-form-primary-action").click();

    // Step 2: Visual Documentation — upload a test image
    await page.locator("#listing-image").setInputFiles(
      path.resolve(__dirname, "fixtures/test-equipment.jpg")
    );
    // Wait for upload to finish (button re-enables)
    await page.locator("button.donor-form-primary-action").waitFor({ state: "visible" });
    await expect(page.locator("button.donor-form-primary-action")).toBeEnabled({ timeout: 15_000 });
    await page.locator("button.donor-form-primary-action").click();

    // Step 3: Logistics & Pickup
    await page.locator("#listing-location").fill("Building 42, Room 101, Boston MA");
    await page.locator("#listing-dimensions-weight").fill("18 x 18 x 14 in, 35 lbs");
    await page.locator("#listing-handling-requirements").fill("Standard lab handling, no special requirements");
    await page.locator("#listing-documentation-included").fill("User manual, calibration certificate");
    await page.locator("#listing-special-flags").fill("Decontaminated, no biohazard history");
    await page.locator("button.donor-form-primary-action").click();

    // Step 4: Compliance PDFs
    // Open and upload decontamination PDF
    const complianceCards = page.locator(".donor-compliance-card");
    const firstCard = complianceCards.first();
    await firstCard.getByRole("button", { name: /open pdf form/i }).click();

    // Upload the completed PDF
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(
      path.resolve(__dirname, "fixtures/decontamination.pdf")
    );
    await expect(firstCard).toHaveClass(/donor-compliance-card-complete/, { timeout: 15_000 });

    // Upload second PDF (liability release)
    const secondCard = complianceCards.nth(1);
    await secondCard.getByRole("button", { name: /open pdf form|replace pdf/i }).click();
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles(
      path.resolve(__dirname, "fixtures/liability.pdf")
    );
    await expect(secondCard).toHaveClass(/donor-compliance-card-complete/, { timeout: 15_000 });

    // Submit for admin review
    const submitButton = page.locator("button.donor-form-primary-action");
    await expect(submitButton).toBeEnabled({ timeout: 10_000 });
    await submitButton.click();

    // Verify we see a success state — listing status should show pending
    await expect(page.getByText(/pending/i).first()).toBeVisible({ timeout: 10_000 });

    // --- Step 2: Admin approves the listing ---
    await loginAs(page, "admin");
    await page.goto("/admin");

    // Find the listing in the moderation queue and click it to open the review modal
    const listingRow = page.locator(".ops-table-row-clickable", { hasText: LISTING_TITLE });
    await expect(listingRow).toBeVisible({ timeout: 10_000 });
    await listingRow.click();

    // In the listing review modal, select "Approved" (value="live") and submit
    const statusSelect = page.locator("select[name='status']");
    await statusSelect.selectOption("live");
    await page.getByRole("button", { name: /update status/i }).click();

    // Verify the modal closes after successful update
    await expect(statusSelect).not.toBeVisible({ timeout: 10_000 });
  });
});
