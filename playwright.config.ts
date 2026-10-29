import { defineConfig, devices } from "@playwright/test";

// E2E contra a stack local de dev (docker compose): web em :3000 e API em :8002.
// Rode via `make test-e2e` (sobe a stack quando necessário).
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // Mesma conta e2e em série para assertions de saldo/ordem ficarem estáveis.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [
    ["list"],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: "**/*.setup.ts",
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: ".playwright/.auth/user.json",
      },
      dependencies: ["setup"],
      testIgnore: ["**/*.setup.ts", "**/*.cleanup.ts"],
    },
    {
      name: "cleanup",
      use: { storageState: ".playwright/.auth/user.json" },
      dependencies: ["chromium"],
      testMatch: "**/*.teardown.ts",
    },
  ],
});
