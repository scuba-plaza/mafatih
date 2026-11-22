import type { Page } from "@playwright/test";

const STORAGE_EVENTS = "__storageEvents";

export async function afterFrames(page: Page, count = 3): Promise<void> {
  await page.evaluate(
    (frames) =>
      new Promise<void>((resolve) => {
        const step = (left: number) => (left <= 0 ? resolve() : requestAnimationFrame(() => step(left - 1)));
        step(frames);
      }),
    count,
  );
}

export async function watchStorageEvents(page: Page): Promise<void> {
  await page.evaluate((key) => {
    Reflect.set(window, key, 0);
    window.addEventListener("storage", () => Reflect.set(window, key, Number(Reflect.get(window, key)) + 1));
  }, STORAGE_EVENTS);
}

export async function storageEventsSeen(page: Page): Promise<number> {
  return page.evaluate((key) => Number(Reflect.get(window, key)), STORAGE_EVENTS);
}
