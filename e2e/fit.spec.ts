import { expect, type Page, test } from "@playwright/test";
import { expectOneScreen } from "./helpers/fit.ts";
import { seedSettings } from "./helpers/profile.ts";
import { shownText, startTyping, surface, typeKeys } from "./helpers/typing.ts";

const CUSTOM_TEXT = "بسم الله الرحمن الرحيم";
const DESKTOP_PROJECT = "chromium-desktop";

interface Size {
  readonly width: number;
  readonly height: number;
  readonly touch: boolean;
}

interface Entry {
  readonly name: string;
  readonly hash: string;
  readonly player: boolean;
  readonly settings: Record<string, unknown>;
}

const AT_REST: readonly Size[] = [
  { width: 375, height: 667, touch: true },
  { width: 390, height: 844, touch: true },
  { width: 412, height: 915, touch: true },
  { width: 820, height: 1180, touch: true },
  { width: 1280, height: 720, touch: false },
  { width: 1366, height: 650, touch: false },
  { width: 1366, height: 768, touch: false },
  { width: 1920, height: 1080, touch: false },
  { width: 2560, height: 1300, touch: false },
];

const ENTRIES: readonly Entry[] = [
  { name: "passage 1", hash: "#/recitation/1", player: true, settings: {} },
  { name: "passage 2:255", hash: "#/recitation/2/255", player: true, settings: {} },
  { name: "practice", hash: "#/practice", player: false, settings: {} },
  { name: "custom practice", hash: "#/custom", player: false, settings: { customText: CUSTOM_TEXT } },
];

const LONG_PASSAGE = "#/recitation/2/255";
const KEYBOARD_GUIDE: Readonly<Record<string, Readonly<Record<string, boolean>>>> = {
  "1280x720": { "passage 1": false, "passage 2:255": false },
  "1366x650": { "passage 1": false, "passage 2:255": false },
  "1366x768": { "passage 1": true, "passage 2:255": true },
  "1920x1080": { "passage 1": true, "passage 2:255": true, practice: true, "custom practice": true },
  "2560x1300": { "passage 1": true, "passage 2:255": true, practice: true, "custom practice": true },
};

function guideExpectation(size: Size, entry: Entry): boolean | "either" {
  return size.touch ? false : (KEYBOARD_GUIDE[`${size.width}x${size.height}`]?.[entry.name] ?? "either");
}
const SMALL_PHONE = { width: 375, height: 420 };

function lessonWindow(page: Page) {
  return surface(page).locator("[data-lesson-text]");
}

async function open(page: Page, hash: string, settings: Record<string, unknown> = {}): Promise<void> {
  await seedSettings(page, settings);
  await page.goto(`/${hash}`);
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
}

for (const size of AT_REST) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({
      viewport: { width: size.width, height: size.height },
      hasTouch: size.touch,
      isMobile: size.touch && size.width < 768,
    });

    for (const entry of ENTRIES) {
      test(`fits one screen: ${entry.name} at ${size.width}x${size.height}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the matrix sets its own viewport and touch");
        await open(page, entry.hash, entry.settings);
        await expectOneScreen(page, { header: true, player: entry.player, guide: guideExpectation(size, entry) });
      });
    }
  });
}

test.describe("long passages", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("scroll inside their window, never the page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, LONG_PASSAGE);
    const lesson = lessonWindow(page);
    expect(await lesson.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(40);
    await expectOneScreen(page, { header: true, player: true, guide: true });
    const letters = [...(await shownText(page))].filter((character) => /[ء-ي ]/.test(character));
    await typeKeys(page, letters.slice(0, 160));
    await expect
      .poll(async () => {
        const box = await lesson.boundingBox();
        const caret = await surface(page).locator("[data-caret]").boundingBox();
        return (
          box !== null && caret !== null && caret.y >= box.y - 1 && caret.y + caret.height <= box.y + box.height + 1
        );
      })
      .toBe(true);
  });
});

for (const size of [
  { width: 1366, height: 768 },
  { width: 1920, height: 1080 },
]) {
  test.describe(`whole lines at ${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test("a long passage window shows whole lines only, with the caret on its row", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
      await open(page, LONG_PASSAGE);
      const letters = [...(await shownText(page))].filter((character) => /[ء-ي ]/.test(character));
      await typeKeys(page, letters.slice(0, 160));
      const lesson = lessonWindow(page);
      const measure = () =>
        lesson.evaluate((element) => {
          const style = getComputedStyle(element);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const padTop = Number.parseFloat(style.paddingTop);
          const frame = element.getBoundingClientRect();
          const caret = document.querySelector("[data-caret]")?.getBoundingClientRect();
          const lines = (frame.height - padTop) / lineHeight;
          const row =
            caret === undefined
              ? Number.NaN
              : (caret.top - frame.top - padTop - (lineHeight - caret.height) / 2) / lineHeight;
          return { lines, row };
        });
      await expect.poll(async () => Math.abs((await measure()).lines % 1)).toBeLessThan(0.02);
      const { lines } = await measure();
      await expect.poll(async () => Math.abs((await measure()).row - (lines >= 3 ? 1 : 0))).toBeLessThan(0.05);
    });
  });
}

for (const fontSize of [28, 72]) {
  test.describe(`font size ${fontSize}`, () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test("the keyboard guide never overlaps the text", async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
      await open(page, "#/recitation/1", { fontSize });
      const gap = await page.evaluate(() => {
        const guide = document.querySelector("[data-guide-keyboard]");
        const lesson = document.querySelector("[data-lesson-text]");
        const shown = guide !== null && getComputedStyle(guide).display !== "none";
        return shown && lesson !== null
          ? guide.getBoundingClientRect().top - lesson.getBoundingClientRect().bottom
          : null;
      });
      expect(gap === null || gap >= 32 - 1).toBe(true);
    });
  });
}

test.describe("the stage", () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test("spare space is split evenly above and below the text, keyboard and live line", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, "#/recitation/1");
    const sides = await page.locator("[data-stage]").evaluate((stage) => {
      const shown = [...stage.children].filter(
        (child) => getComputedStyle(child).display !== "none" && child.getBoundingClientRect().height > 0,
      );
      const frame = stage.getBoundingClientRect();
      const first = shown[0]?.getBoundingClientRect();
      const last = shown[shown.length - 1]?.getBoundingClientRect();
      return { above: (first?.top ?? 0) - frame.top, below: frame.bottom - (last?.bottom ?? 0) };
    });
    expect(sides.above).toBeGreaterThan(100);
    expect(Math.abs(sides.above - sides.below)).toBeLessThanOrEqual(2);
  });
});

test.describe("pages that are not typing views", () => {
  test.use({ viewport: SMALL_PHONE, hasTouch: true, isMobile: true });

  for (const hash of ["#/", "#/stats", "#/about", "#/custom"]) {
    test(`${hash} still scrolls under a tab bar that stays put`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
      await seedSettings(page, {});
      await page.goto(`/${hash}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const bar = await page.locator("[data-tabbar]").boundingBox();
      expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeCloseTo(SMALL_PHONE.height, 0);
    });
  }
});

test.describe("a window too small for everything", () => {
  test.use({ viewport: { width: 640, height: 360 } });

  test("falls back to page scroll with every control reachable", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, "#/recitation/1");
    const play = page.getByRole("button", { name: "Play", exact: true });
    await play.scrollIntoViewIfNeeded();
    const uncovered = await play.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return top !== null && button.contains(top);
    });
    expect(uncovered).toBe(true);
  });
});
