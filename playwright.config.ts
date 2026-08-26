import { defineConfig, devices } from "@playwright/test";

const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: { baseURL: externalBaseUrl ?? "http://127.0.0.1:3100", trace: "retain-on-failure" },
  webServer: externalBaseUrl ? undefined : {
    command: "NEXT_DIST_DIR=.next-e2e UMANG_E2E_AGENCY=approved pnpm dev --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: true,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
