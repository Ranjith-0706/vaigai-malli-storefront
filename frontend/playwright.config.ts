import { defineConfig, devices } from "@playwright/test";

const WEB_PORT = process.env.E2E_WEB_PORT ?? "3100";
const API_PORT = process.env.E2E_API_PORT ?? "8011";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }], ["json", { outputFile: "test-results/results.json" }]],
  outputDir: "test-results/artifacts",
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: /admin\.spec\.ts/ },
  ],
  webServer: [
    {
      command: "node e2e/start-api.mjs",
      url: `http://localhost:${API_PORT}/health`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      // Production build: also proves `next build` works against a live API.
      command: `npm run build && npm run start -- -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: { API_URL: `http://localhost:${API_PORT}`, NEXT_DIST_DIR: ".next-e2e", NEXT_PUBLIC_SITE_URL: `http://localhost:${WEB_PORT}` },
    },
  ],
});
