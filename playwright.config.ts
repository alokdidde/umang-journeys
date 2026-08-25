import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: externalBaseUrl ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: externalBaseUrl ? undefined : { command: "pnpm dev --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: true },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
