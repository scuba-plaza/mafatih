import type { Page } from "@playwright/test";

const SYSTEMS = {
  mac: { platform: "MacIntel", hint: "macOS" },
  windows: { platform: "Win32", hint: "Windows" },
} as const;

export async function emulatePlatform(page: Page, system: keyof typeof SYSTEMS): Promise<void> {
  const { platform, hint } = SYSTEMS[system];
  await page.addInitScript(
    ([legacy, modern]) => {
      Object.defineProperty(navigator, "platform", { get: () => legacy, configurable: true });
      Object.defineProperty(navigator, "userAgentData", { get: () => ({ platform: modern }), configurable: true });
    },
    [platform, hint] as const,
  );
}
