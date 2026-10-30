import { defineConfig } from "@playwright/test";
import product from "./product.json" with { type: "json" };
const webPort = product.webPort + 100;
const apiPort = product.apiPort + 100;
export default defineConfig({
  testDir: "acceptance",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 10000 },
  use: {
    colorScheme: "light",
    baseURL: "http://127.0.0.1:" + webPort,
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "WORKSPACE_API_PORT=" +
        apiPort +
        " api/.venv/bin/python api/scripts/local_postgres.py --temporary -- -m scripts.run_acceptance",
      url: "http://127.0.0.1:" + apiPort + "/api/health",
      timeout: 60000,
      reuseExistingServer: false,
      gracefulShutdown: { signal: "SIGTERM", timeout: 15000 },
    },
    {
      command:
        "WORKSPACE_API_PORT=" +
        apiPort +
        " npm exec vite -- --host 127.0.0.1 --port " +
        webPort +
        " --strictPort",
      url: "http://127.0.0.1:" + webPort,
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
  outputDir: "output/browser-results",
  reporter: "list",
});
