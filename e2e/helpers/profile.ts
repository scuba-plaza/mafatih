import type { Page } from "@playwright/test";

export const PROFILE_KEY = "mafatih:profile:2";

export async function storeItem(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(([name, stored]) => localStorage.setItem(name, stored), [key, value] as const);
}

export async function seedProfile(
  page: Page,
  parts: { readonly settings?: Record<string, unknown> } & Record<string, unknown>,
): Promise<void> {
  const { settings = {}, ...progress } = parts;
  const value = JSON.stringify({ schema: 2, settings: { language: "en", ...settings }, ...progress });
  await storeItem(page, PROFILE_KEY, value);
}

export async function seedSettings(page: Page, settings: Record<string, unknown>): Promise<void> {
  await seedProfile(page, { settings });
}

export async function resaveProfile(page: Page): Promise<void> {
  await page.evaluate((key) => {
    localStorage.setItem(key, JSON.stringify(JSON.parse(localStorage.getItem(key) ?? "{}"), null, 1));
  }, PROFILE_KEY);
}

export async function savedProfile(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}"), PROFILE_KEY);
}

export async function savedSettings(page: Page): Promise<Record<string, unknown>> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "{}").settings ?? {}, PROFILE_KEY);
}
