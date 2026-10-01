import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./redesign",
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    channel: "chrome",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 900 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
  ],
  webServer: {
    command: "cd ../frontend && npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
