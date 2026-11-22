import { expect, type Page, test } from "@playwright/test";
import { expectLayoutIntact, expectOneScreen, openSoftKeyboard, resizeAndSettle } from "./helpers/fit.ts";
import { emulatePlatform } from "./helpers/platform.ts";
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

interface Keyboard {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly share: number;
  readonly apple: boolean;
}

const KEYBOARD_UP: readonly Keyboard[] = [
  { name: "iPhone 12 mini", width: 375, height: 812, share: 0.38, apple: true },
  { name: "iPhone SE", width: 375, height: 667, share: 0.38, apple: true },
  { name: "Pixel 7", width: 412, height: 915, share: 0.3, apple: false },
];

const APPLE_BAR = 64;

for (const phone of KEYBOARD_UP) {
  test.describe(`${phone.name} with the keyboard up`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height }, hasTouch: true, isMobile: true });

    for (const entry of ENTRIES) {
      test(`fits one screen with the keyboard up: ${entry.name} on ${phone.name}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the matrix sets its own viewport and touch");
        if (phone.apple) {
          await emulatePlatform(page, "iphone");
        }
        await open(page, entry.hash, entry.settings);
        await openSoftKeyboard(page, phone.share);
        await expect(page.locator("header > div")).toBeHidden();
        await expectOneScreen(page, {
          header: false,
          player: entry.player,
          guide: false,
          tabBar: false,
          reserve: phone.apple ? APPLE_BAR : 0,
        });
      });
    }
  });
}

test.describe("a phone whose focus is on the volume slider", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test("a window that shrinks is not taken for a keyboard, because no text is being typed", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await page.goto("/#/recitation/1/1");
    await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeAttached();
    const audio = page.getByRole("group", { name: "Recitation audio" });
    await audio.getByRole("button", { name: "Audio options" }).click();
    const volume = audio.getByRole("slider", { name: "Volume" });
    await volume.focus();
    await expect(volume).toBeFocused();
    await resizeAndSettle(page, { width: 375, height: 400 });
    await expect(page.locator("header > div")).toBeVisible();
    await expect(page.locator("[data-tabbar]")).toBeVisible();
  });
});

test.describe("an iPad with the keyboard up", () => {
  test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true });

  test("keeps the header", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, "#/recitation/1");
    await openSoftKeyboard(page, 0.3);
    await expect(page.locator("header > div")).toBeVisible();
    await expectOneScreen(page, { header: true, player: true, guide: false });
  });
});

test.describe("a landscape phone with the keyboard up", () => {
  test.use({ viewport: { width: 812, height: 375 }, hasTouch: true, isMobile: true });

  for (const entry of ENTRIES) {
    test(`shows only the text: ${entry.name}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
      await emulatePlatform(page, "iphone");
      await open(page, entry.hash, entry.settings);
      const [first] = [...(await shownText(page))].filter((character) => /[ء-ي]/.test(character));
      await typeKeys(page, [first ?? "ب"]);
      await openSoftKeyboard(page, 0.43);
      await expect(page.locator("[data-live-stats]")).toHaveCount(0);
      if (entry.player) {
        await expect(page.getByRole("button", { name: "Previous passage" })).toBeHidden();
        await expect(page.getByRole("group", { name: "Passage" })).toBeHidden();
      }
      const room = await lessonWindow(page).evaluate((element) => {
        const style = getComputedStyle(element);
        return element.clientHeight - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.lineHeight);
      });
      expect(room).toBeGreaterThanOrEqual(-1);
      await expectOneScreen(page, {
        header: false,
        player: false,
        pager: false,
        guide: false,
        tabBar: false,
        reserve: APPLE_BAR,
      });
    });
  }
});

const REALISTIC: readonly Keyboard[] = [
  { name: "iPhone SE in Safari", width: 375, height: 548, share: 0.38, apple: true },
  { name: "iPhone 12 mini in Safari", width: 375, height: 629, share: 0.38, apple: true },
  { name: "Android in Chrome", width: 360, height: 672, share: 0.3, apple: false },
];

for (const phone of REALISTIC) {
  test.describe(`${phone.name} with the keyboard up`, () => {
    test.use({ viewport: { width: phone.width, height: phone.height }, hasTouch: true, isMobile: true });

    for (const entry of ENTRIES) {
      test(`nothing overlaps: ${entry.name} on ${phone.name}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
        if (phone.apple) {
          await emulatePlatform(page, "iphone");
        }
        await open(page, entry.hash, entry.settings);
        await openSoftKeyboard(page, phone.share);
        await expect(page.locator("header > div")).toBeHidden();
        await expectLayoutIntact(page);
      });
    }
  });
}

test.describe("phones when the keyboard goes away", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

  test("the header comes back", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, "#/recitation/1");
    await openSoftKeyboard(page, 0.38);
    await expect(page.locator("header > div")).toBeHidden();
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator("header > div")).toBeVisible();
  });

  test("Settings opened on a phone is never hidden under a collapsed header, even with a text field in it and the keyboard up", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, "#/recitation/1");
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog).toBeVisible();
    await dialog.evaluate((element) => {
      const input = document.createElement("input");
      input.type = "text";
      input.setAttribute("data-test-field", "");
      input.setAttribute("aria-label", "A text field");
      element.append(input);
    });
    const field = dialog.locator("[data-test-field]");
    await field.focus();
    await expect(field).toBeFocused();
    await page.setViewportSize({ width: 375, height: 413 });
    await expect(page.locator("[data-tabbar]")).toBeHidden();
    await expect(dialog).toBeVisible();
    await expect(field).toBeFocused();
    await expect(page.locator("header > div")).toBeVisible();
  });
});

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

for (const [fontSize, guideShown] of [
  [28, true],
  [72, false],
] as const) {
  test.describe(`font size ${fontSize}`, () => {
    test.use({ viewport: { width: 1366, height: 768 } });

    test(`the keyboard guide is ${guideShown ? "shown" : "hidden"} and never overlaps the text`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
      await open(page, "#/recitation/1", { fontSize });
      const facts = await page.evaluate(() => {
        const guide = document.querySelector("[data-guide-keyboard]");
        const lesson = document.querySelector("[data-lesson-text]");
        if (lesson === null) {
          return null;
        }
        const style = getComputedStyle(lesson);
        const lines = (lesson.clientHeight - Number.parseFloat(style.paddingTop)) / Number.parseFloat(style.lineHeight);
        const shown = guide !== null && getComputedStyle(guide).display !== "none";
        return {
          shown,
          lines,
          gap:
            shown && guide !== null ? guide.getBoundingClientRect().top - lesson.getBoundingClientRect().bottom : null,
        };
      });
      expect(facts?.shown).toBe(guideShown);
      expect(facts?.lines).toBeGreaterThanOrEqual(1.99);
      if (facts?.gap !== null && facts?.gap !== undefined) {
        expect(facts.gap).toBeGreaterThanOrEqual(31);
      }
    });
  });
}

test.describe("after the text re-wraps while the field is not focused", () => {
  test.use({ viewport: { width: 1366, height: 768 } });

  test("the caret is back inside the window once the text is clicked", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
    await open(page, LONG_PASSAGE);
    const letters = [...(await shownText(page))].filter((character) => /[ء-ي ]/.test(character));
    await typeKeys(page, letters.slice(0, 160));
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByRole("slider", { name: "Lesson text size" }).focus();
    await page.keyboard.press("End");
    await dialog.getByRole("button", { name: "Done" }).click();
    await startTyping(page);
    const lesson = lessonWindow(page);
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

test.describe("a stylesheet that arrives late", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  for (const fontSize of [28, 72]) {
    test(`does not crash the page at font size ${fontSize}`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== DESKTOP_PROJECT && testInfo.project.name !== "webkit", "engines share this");
      await page.route("**/*.css", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        await route.continue();
      });
      await seedSettings(page, { customText: CUSTOM_TEXT, fontSize });
      await page.goto("/#/custom");
      await expect(lessonWindow(page)).toBeVisible({ timeout: 15000 });
      await expect(page.getByText("Something went wrong")).toHaveCount(0);
      await expect
        .poll(() => lessonWindow(page).evaluate((element) => Number.parseFloat(getComputedStyle(element).lineHeight)))
        .toBeGreaterThan(20);
    });
  }
});

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

const TOO_SMALL = [
  { width: 640, height: 360 },
  { width: 911, height: 433 },
];

for (const size of TOO_SMALL) {
  test.describe(`a ${size.width}x${size.height} window`, () => {
    test.use({ viewport: size });

    for (const entry of ENTRIES) {
      test(`scrolls instead of overlapping: ${entry.name}`, async ({ page }, testInfo) => {
        test.skip(testInfo.project.name !== DESKTOP_PROJECT, "the viewport is set here");
        await open(page, entry.hash, entry.settings);
        await expectLayoutIntact(page);
        if (entry.player) {
          const play = page.getByRole("button", { name: "Play", exact: true });
          await play.scrollIntoViewIfNeeded();
          const uncovered = await play.evaluate((button) => {
            const rect = button.getBoundingClientRect();
            const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
            return top !== null && button.contains(top);
          });
          expect(uncovered).toBe(true);
        }
      });
    }
  });
}
