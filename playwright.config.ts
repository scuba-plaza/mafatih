import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;
const executablePath = process.env.PW_CHROMIUM_PATH;
const chromium = executablePath === undefined ? {} : { launchOptions: { executablePath } };

const everyEngine = [
  { name: "firefox", use: { ...devices["Desktop Firefox"] } },
  { name: "webkit", use: { ...devices["Desktop Safari"] } },
  { name: "webkit-mobile", use: { ...devices["iPhone 14"] } },
];

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: process.env.CI !== undefined,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  webServer: {
    command: `pnpm build && pnpm exec vite preview --port ${PORT} --strictPort`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "chromium-desktop", use: { ...devices["Desktop Chrome"], ...chromium } },
    { name: "chromium-mobile", use: { ...devices["Pixel 7"], ...chromium } },
    ...(process.env.PW_FULL === "1" ? everyEngine : []),
  ],
});
