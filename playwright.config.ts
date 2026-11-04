import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 30000 },
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    browserName: "chromium",
    channel: "msedge",
    headless: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  webServer: {
    command:
      process.env.E2E_SERVER_COMMAND ||
      (process.env.E2E_USE_PRODUCTION === "true" ? "pnpm start" : "pnpm dev"),
    url: process.env.E2E_BASE_URL || "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
