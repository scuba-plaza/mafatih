import type { Page } from "@playwright/test";

export const PROFILE_KEY = "mafatih:profile:2";

export async function seedSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
  const value = JSON.stringify({ schema: 2, settings: { language: "en", ...settings } });
  await page.addInitScript(([key, stored]) => localStorage.setItem(key, stored), [PROFILE_KEY, value] as const);
}

export async function savedSettings(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").settings ?? {}, PROFILE_KEY);
}
