import { expect, type Page } from "@playwright/test";
import { seedProfile } from "./profile.ts";

export const PAGES = [
  { name: "map", hash: "#/", typing: false },
  { name: "passage", hash: "#/recitation/1", typing: true },
  { name: "practice", hash: "#/practice", typing: true },
  { name: "custom", hash: "#/custom", typing: true },
  { name: "stats", hash: "#/stats", typing: false },
  { name: "about", hash: "#/about", typing: false },
] as const;

export type PageName = (typeof PAGES)[number]["name"];

export type Language = "en" | "ar";

const MODES = ["practice", "recitation", "custom"] as const;

function stat(attempts: number, hits: number, meanMs: number) {
  return { attempts, hits, timed: hits, meanMs, recentAccuracy: hits / attempts };
}

export async function seedTypicalProfile(page: Page, language: Language): Promise<void> {
  await seedProfile(page, {
    settings: { language, customText: "بسم الله الرحمن الرحيم" },
    ladder: { unlocked: 14 },
    stats: {
      practice: { ب: stat(10, 9, 420), ا: stat(7, 7, 380), " ": stat(5, 5, 300) },
      recitation: { ك: stat(3, 3, 500) },
      custom: { ت: stat(2, 1, 700) },
    },
    history: Array.from({ length: 12 }, (_, index) => ({
      at: Date.UTC(2026, 10, index + 1, 12, 0),
      mode: MODES[index % 3],
      chars: 60,
      ms: 30_000,
      accuracy: 0.95,
    })),
  });
}

export async function openAndWait(page: Page, hash: string, typing: boolean): Promise<void> {
  await page.goto(`/${hash}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (typing) {
    const text = page.locator("[data-lesson-text]");
    await expect(text).toBeVisible();
    await expect(text).not.toHaveText("");
  }
}
