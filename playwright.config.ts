import { defineConfig, devices } from "@playwright/test";

const URL = "http://localhost:4173";
const executablePath = process.env.PW_CHROMIUM_PATH;
const chromium = executablePath === undefined ? {} : { launchOptions: { executablePath } };
const otherEngines =
  process.env.PW_FULL === "1"
    ? [
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
        { name: "webkit-mobile", use: { ...devices["iPhone 15"] } },
      ]
    : [];

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: "list",
  use: { baseURL: URL, trace: "off" },
  webServer: { command: "pnpm exec vite preview --port 4173 --strictPort", url: URL, reuseExistingServer: false },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], ...chromium } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"], ...chromium } },
    ...otherEngines,
  ],
});
