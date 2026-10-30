import { defineConfig } from "@playwright/test";
import product from "./product.json" with { type: "json" };
export default defineConfig({
  testDir: "acceptance",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    colorScheme: "light",
    baseURL: "http://127.0.0.1:" + product.webPort,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "api/.venv/bin/python api/scripts/with_local_postgres.py --temporary -- -m scripts.acceptance",
      url: "http://127.0.0.1:" + product.apiPort + "/api/health",
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command:
        "yarn vite --host 127.0.0.1 --port " +
        product.webPort +
        " --strictPort",
      url: "http://127.0.0.1:" + product.webPort,
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
  outputDir: "output/browser-results",
  reporter: "list",
});
