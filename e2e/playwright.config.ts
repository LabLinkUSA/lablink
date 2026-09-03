import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  retries: 1,
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "cd ../backend && source .venv/bin/activate && uvicorn app.main:app --port 8000",
      port: 8000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
    {
      command: "cd ../frontend && npm run dev",
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
