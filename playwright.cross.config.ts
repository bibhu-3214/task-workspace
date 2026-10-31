import { defineConfig, devices } from "@playwright/test";
import connected from "./playwright.connected.config";
export default defineConfig(connected, {
  testMatch: [
    "**/reliability.spec.ts",
    "**/premium.spec.ts",
    "**/product-upgrades.spec.ts",
  ],
  workers: 1,
  projects: [
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"], channel: undefined },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"], channel: undefined },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 14"], channel: undefined },
    },
  ],
});
