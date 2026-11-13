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

const TYPED_HIGHLIGHTS = ["mafatih-done", "mafatih-done-playing"];

export async function doneText(page: Page): Promise<string> {
  return page.evaluate((names) => {
    const ranges = names.flatMap((name) => [...(CSS.highlights.get(name) ?? [])] as Range[]);
    const first = ranges.sort((a, b) => a.compareBoundaryPoints(Range.START_TO_START, b));
    return first.map((range) => range.toString()).join("");
  }, TYPED_HIGHLIGHTS);
}

export async function paintedTwice(page: Page): Promise<number> {
  return page.evaluate(() => {
    const ranges = [...CSS.highlights.entries()]
      .filter(([name]) => name.startsWith("mafatih-"))
      .flatMap(([, highlight]) => [...highlight] as Range[]);
    let overlaps = 0;
    for (const [index, range] of ranges.entries()) {
      for (const other of ranges.slice(index + 1)) {
        const apart =
          range.compareBoundaryPoints(Range.START_TO_END, other) <= 0 ||
          other.compareBoundaryPoints(Range.START_TO_END, range) <= 0;
        if (!apart) {
          overlaps += 1;
        }
      }
    }
    return overlaps;
  });
}
