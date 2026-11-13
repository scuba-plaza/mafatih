import type { Locator, Page } from "@playwright/test";

export function passageRange(page: Page, text: string): Locator {
  return page.getByRole("status").filter({ hasText: text });
}

export function passageBar(page: Page): Locator {
  return page.getByRole("group", { name: "Passage" });
}
