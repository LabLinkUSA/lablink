import { type Page } from "@playwright/test";

export interface TestUser {
  email: string;
  password: string;
  role: "donor_lab" | "recipient_institution" | "admin";
}

export const TEST_USERS: Record<string, TestUser> = {
  donor: {
    email: process.env.E2E_DONOR_EMAIL || "e2e-donor@lablink.test",
    password: process.env.E2E_DONOR_PASSWORD || "TestPassword123!",
    role: "donor_lab",
  },
  recipient: {
    email: process.env.E2E_RECIPIENT_EMAIL || "e2e-recipient@lablink.test",
    password: process.env.E2E_RECIPIENT_PASSWORD || "TestPassword123!",
    role: "recipient_institution",
  },
  admin: {
    email: process.env.E2E_ADMIN_EMAIL || "e2e-admin@lablink.test",
    password: process.env.E2E_ADMIN_PASSWORD || "TestPassword123!",
    role: "admin",
  },
};

/**
 * Sign in as a test user via the login form.
 * Waits for redirect away from /auth/ to confirm successful login.
 */
export async function loginAs(page: Page, userKey: keyof typeof TEST_USERS): Promise<void> {
  const user = TEST_USERS[userKey];
  await page.goto("/auth");
  await page.locator("#sign-in-email").fill(user.email);
  await page.locator("#sign-in-password").fill(user.password);
  await page.locator("button.auth-screen-primary-button").click();
  await page.waitForURL((url) => !url.pathname.includes("/auth"), { timeout: 15_000 });
}
