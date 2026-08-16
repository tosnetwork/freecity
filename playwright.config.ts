import { defineConfig } from "@playwright/test";

import { TEST_CONTROL_KEY } from "./e2e/helpers";

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://freecity:freecity@localhost:5433/freecity";
const E2E_RUN_ID = `${Date.now()}-${process.pid}`;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  webServer: [
    {
      command: "pnpm --filter @freecity/application-api dev",
      url: "http://localhost:3001/healthz",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        DATABASE_URL,
        AUTH_MODE: "dev",
        FREECITY_TEST_CONTROLS: "1",
        FREECITY_TEST_CONTROL_KEY: TEST_CONTROL_KEY,
        FREECITY_DISTRICT_ID: `district-e2e-${E2E_RUN_ID}`,
        FREECITY_SEASON_ID: "season-e2e",
      },
    },
    {
      command: "pnpm --filter @freecity/web dev",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
