import type { Locator, Page } from "@playwright/test";

export function surface(page: Page): Locator {
  return page.getByRole("region", { name: "Text to type" });
}

export async function startTyping(page: Page): Promise<void> {
  await surface(page).click();
}

export async function typeKeys(page: Page, keys: readonly string[]): Promise<void> {
  for (const key of keys) {
    if (key === "Backspace") {
      await page.keyboard.press("Backspace");
    } else {
      await page.keyboard.insertText(key);
    }
  }
}

export async function shownText(page: Page): Promise<string> {
  return surface(page)
    .locator("[data-lesson-text]")
    .evaluate((element) => element.textContent ?? "");
}

export async function doneText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const highlight = CSS.highlights.get("mafatih-done");
    return highlight === undefined ? "" : [...highlight].map((range) => range.toString()).join("");
  });
}
