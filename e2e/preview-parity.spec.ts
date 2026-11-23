import { expect, type Page, test } from "@playwright/test";
import { openSettingsGroup } from "./helpers/pages.ts";
import { seedProfile } from "./helpers/profile.ts";
import { doneText, startTyping, typeKeys } from "./helpers/typing.ts";

const SAMPLE = "كِتَابٌ جَدِيدٌ عَلَى الطَّاوِلَةِ وَالقَلَمُ بِجَانِبِهِ";
const KASRA = "ِ";
const FATHA = "َ";
const DAMMATAN = "ٌ";

const LETTER_KEYS = ["ك", "ت", "ا", "ب", " "];
const HARAKAT_KEYS = ["ك", KASRA, "ت", FATHA, "ا", "ب", " "];
const FULL_KEYS = ["ك", KASRA, "ت", FATHA, "ا", "ب", DAMMATAN, " "];

type Vocalization = "auto" | "letters" | "harakat" | "full";

interface Case {
  readonly name: string;
  readonly settings: Record<string, unknown>;
  readonly unlocked: number;
  readonly keys: readonly string[];
}

const FONTS = ["scheherazade", "amiri", "naskh"] as const;
const SIZES = [28, 40, 72] as const;

const VOCALIZATIONS: readonly {
  readonly name: string;
  readonly vocalization: Vocalization;
  readonly unlocked: number;
  readonly keys: readonly string[];
}[] = [
  { name: "auto with no marks unlocked", vocalization: "auto", unlocked: 10, keys: LETTER_KEYS },
  { name: "auto with every key unlocked", vocalization: "auto", unlocked: 44, keys: FULL_KEYS },
  { name: "letters only", vocalization: "letters", unlocked: 10, keys: LETTER_KEYS },
  { name: "harakat", vocalization: "harakat", unlocked: 10, keys: HARAKAT_KEYS },
  { name: "full", vocalization: "full", unlocked: 10, keys: FULL_KEYS },
];

const CASES: Case[] = [
  ...FONTS.flatMap((font) =>
    SIZES.map((fontSize) => ({
      name: `font ${font} at size ${fontSize}`,
      settings: { font, fontSize },
      unlocked: 10,
      keys: LETTER_KEYS,
    })),
  ),
  ...VOCALIZATIONS.flatMap((entry) =>
    [true, false].map((requireBackspace) => ({
      name: `vocalization ${entry.name}, Backspace correction ${requireBackspace ? "on" : "off"}`,
      settings: { vocalization: entry.vocalization, requireBackspace },
      unlocked: entry.unlocked,
      keys: entry.keys,
    })),
  ),
];

const SWITCHES = ["showKeyboard", "fingerGuide", "keyLabels", "delayedHint"] as const;
const GUIDE_CASES: Case[] = Array.from({ length: 16 }, (_, mask) => {
  const flags = Object.fromEntries(SWITCHES.map((flag, index) => [flag, (mask & (1 << index)) !== 0]));
  return {
    name: `keyboard switches ${mask.toString(2).padStart(4, "0")}`,
    settings: flags,
    unlocked: 10,
    keys: LETTER_KEYS,
  };
});

interface Snapshot {
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: string;
  readonly lineHeightRatio: number;
  readonly highlights: Readonly<Record<string, readonly string[]>>;
  readonly mistakes: string;
  readonly mistakeColor: string;
  readonly caretColor: string;
  readonly guide: string;
}

async function snapshot(page: Page, rootSelector: string, scope: "lesson" | "preview"): Promise<Snapshot> {
  return page.evaluate(
    ([selector, kind]) => {
      const root = document.querySelector(selector);
      if (root === null) {
        throw new Error(`no ${selector}`);
      }
      const text = root.querySelector("[data-lesson-text], [data-preview-text]");
      if (text === null) {
        throw new Error("no lesson text");
      }
      const style = getComputedStyle(text);
      const suffix = kind === "preview" ? "-preview" : "";
      const highlights: Record<string, string[]> = {};
      for (const [name, highlight] of CSS.highlights.entries()) {
        if (name.startsWith("mafatih-") && (kind === "preview" ? name.endsWith(suffix) : !name.endsWith("-preview"))) {
          highlights[kind === "preview" ? name.slice(0, -suffix.length) : name] = [...highlight].map((range) =>
            range.toString(),
          );
        }
      }
      const mistakes = root.querySelector("[data-mistakes]");
      const caret = root.querySelector<HTMLElement>("[data-caret]");
      const guide = root.querySelector<HTMLElement>("[data-guide-keyboard]:not([hidden])");
      const legends = (parent: Element): string =>
        [...parent.querySelectorAll("[data-key]")]
          .map(
            (key) => `${key.getAttribute("data-key")}:${key.textContent}:${key.hasAttribute("data-due") ? "due" : ""}`,
          )
          .join("|");
      const keys = guide === null ? "none" : `${legends(guide)}#${guide.querySelector("p")?.textContent ?? ""}`;
      return {
        text: [...text.querySelectorAll("[data-block]")].map((block) => block.textContent ?? "").join("\n"),
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeightRatio: Number.parseFloat(style.lineHeight) / Number.parseFloat(style.fontSize),
        highlights,
        mistakes: mistakes?.textContent ?? "",
        mistakeColor: mistakes === null ? "" : getComputedStyle(mistakes).color,
        caretColor: caret === null ? "" : getComputedStyle(caret).backgroundColor,
        guide: keys,
      };
    },
    [rootSelector, scope] as const,
  );
}

async function realLesson(page: Page, testCase: Case): Promise<Snapshot> {
  await seedProfile(page, {
    settings: { language: "en", customText: SAMPLE, ...testCase.settings },
    ladder: { unlocked: testCase.unlocked },
  });
  await page.goto("/#/custom");
  await expect(page.locator("[data-lesson-text]")).toHaveText(SAMPLE);
  await startTyping(page);
  await typeKeys(page, testCase.keys);
  await typeKeys(page, ["ب"]);
  await page.waitForTimeout(900);
  return snapshot(page, "[data-stage]", "lesson");
}

for (const testCase of CASES) {
  test(`the preview and the real lesson show the same: ${testCase.name}`, async ({ page, hasTouch }) => {
    if (!hasTouch) {
      await page.setViewportSize({ width: 1440, height: 1300 });
    }
    const real = await realLesson(page, testCase);
    await openSettingsGroup(page, "Lesson");
    await expect(page.locator("[data-preview]")).toBeVisible();
    await expect.poll(() => snapshot(page, "[data-preview]", "preview")).toEqual(real);
  });
}

for (const testCase of GUIDE_CASES) {
  test(`the preview and the real lesson show the same keyboard: ${testCase.name}`, async ({ page, hasTouch }) => {
    test.skip(hasTouch, "a touch screen has no keyboard guide");
    await page.setViewportSize({ width: 1440, height: 1300 });
    const real = await realLesson(page, testCase);
    await openSettingsGroup(page, "Lesson");
    await expect(page.locator("[data-preview]")).toBeVisible();
    await expect.poll(() => snapshot(page, "[data-preview]", "preview")).toEqual(real);
  });
}

test("opening Settings and changing a setting changes the lesson behind it only as the setting says", async ({
  page,
}) => {
  await seedProfile(page, { settings: { language: "en", customText: SAMPLE, vocalization: "letters" } });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ك", "ت", "ا"]);
  const typed = await doneText(page);
  expect(typed.length).toBeGreaterThan(0);
  await openSettingsGroup(page, "Lesson");
  await expect(page.locator("[data-preview]")).toBeVisible();
  expect(await doneText(page)).toBe(typed);
  await page.getByRole("dialog").getByRole("radio", { name: "Amiri", exact: true }).check();
  expect(await doneText(page)).toBe(typed);
  await expect(page.locator("[data-lesson-text]")).toHaveCSS("font-family", /Amiri/);
  await expect(page.locator("[data-preview-text]")).toHaveCSS("font-family", /Amiri/);
  const painted = await page.evaluate(() =>
    [...(CSS.highlights.get("mafatih-done-preview") ?? [])].map((range) => range.toString()).join(""),
  );
  expect(painted.replace(/[ً-ْ]/g, "")).toBe("كتاب ");
});

test("keys pressed while Settings is open do not move the preview or the lesson, and Enter does not activate the lesson", async ({
  page,
}) => {
  await seedProfile(page, { settings: { language: "en", customText: SAMPLE, vocalization: "letters" } });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ك"]);
  await openSettingsGroup(page, "Lesson");
  const before = await snapshot(page, "[data-preview]", "preview");
  const lessonBefore = await doneText(page);
  await page.keyboard.insertText("ت");
  await page.keyboard.press("Enter");
  expect(await snapshot(page, "[data-preview]", "preview")).toEqual(before);
  expect(await doneText(page)).toBe(lessonBefore);
  await expect(page.locator("[data-typing-input]")).not.toBeFocused();
});

test("the preview is inert, holds nothing focusable and announces nothing", async ({ page }) => {
  await page.goto("/#/custom");
  await openSettingsGroup(page, "Lesson");
  const preview = page.locator("[data-preview]");
  await expect(preview).toBeVisible();
  expect(await preview.evaluate((element) => element.hasAttribute("inert"))).toBe(true);
  await expect(preview).toHaveAttribute("aria-hidden", "true");
  await expect(preview.locator("input, button, a, [tabindex], [role=status], [role=alert]")).toHaveCount(0);
  await expect(page.locator("[data-preview-surface]")).toHaveCount(1);
});

test("with Backspace correction on the preview shows the wrong key, with it off it shows none", async ({ page }) => {
  await page.goto("/#/custom");
  await openSettingsGroup(page, "Lesson");
  const mistake = page.locator("[data-preview] [data-mistakes]");
  await expect(mistake).toHaveText("ب");
  await page.getByRole("dialog").getByRole("switch", { name: "Correct mistakes with Backspace" }).uncheck();
  await expect(mistake).toHaveCount(0);
  await page.getByRole("dialog").getByRole("switch", { name: "Correct mistakes with Backspace" }).check();
  await expect(mistake).toHaveText("ب");
});

test("the preview follows the lesson size and font controls at once", async ({ page }) => {
  await page.goto("/#/custom");
  await openSettingsGroup(page, "Lesson");
  const text = page.locator("[data-preview-text]");
  const sizeBefore = await text.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  await page.getByRole("dialog").getByRole("slider", { name: "Lesson text size" }).press("End");
  await expect
    .poll(() => text.evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)))
    .toBeGreaterThan(sizeBefore);
  await page.getByRole("dialog").getByRole("radio", { name: "Noto Naskh Arabic", exact: true }).check();
  await expect(text).toHaveCSS("font-family", /Noto Naskh Arabic/);
});

test.describe("on a wide screen with a mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("the label says how much the preview is shrunk, exactly when it is", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "needs a fine pointer");
    await page.goto("/#/custom");
    await openSettingsGroup(page, "Lesson");
    const scale = await page
      .locator("[data-preview-scale]")
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).zoom) || 1);
    const label = page.getByRole("dialog").getByText(/^Shown at/);
    if (scale < 1) {
      await expect(label).toHaveText(new RegExp(`^Shown at \\D*${Math.round(scale * 100)}\\D*%$`));
    } else {
      await expect(label).toHaveCount(0);
    }
    expect(scale).toBeLessThan(1);
  });

  test("the keyboard guide switches sit with the preview and change its keyboard", async ({ page, hasTouch }) => {
    test.skip(hasTouch, "needs a fine pointer");
    await page.goto("/#/custom");
    await openSettingsGroup(page, "Lesson");
    await expect(page.locator("[data-preview] [data-guide-keyboard]")).toBeVisible();
    await page.getByRole("dialog").getByRole("switch", { name: "Show the keyboard" }).uncheck();
    await expect(page.locator("[data-preview] [data-guide-keyboard]")).toHaveCount(0);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the preview opens from one line to three and stays pinned while the controls scroll", async ({ page }) => {
    await page.goto("/#/custom");
    await openSettingsGroup(page, "Lesson");
    const text = page.locator("[data-preview-text]");
    const height = () =>
      text.evaluate((element) => {
        const style = getComputedStyle(element);
        return element.getBoundingClientRect().height / (Number.parseFloat(style.fontSize) * 2);
      });
    expect(await height()).toBeGreaterThan(0.9);
    expect(await height()).toBeLessThan(1.5);
    await page.getByRole("dialog").getByRole("button", { name: "Preview" }).click();
    expect(await height()).toBeGreaterThan(2.9);
    expect(await height()).toBeLessThan(3.5);
    const pane = page.getByRole("dialog").locator("[data-settings-scroll]");
    const top = async () => (await page.locator("[data-preview]").boundingBox())?.y ?? 0;
    const before = await top();
    await pane.evaluate((element) => element.scrollTo(0, 400));
    expect(await top()).toBe(before);
  });

  test("on a short screen the preview scrolls away with the controls instead of being pinned", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 500 });
    await page.goto("/#/custom");
    await openSettingsGroup(page, "Lesson");
    const top = async () => (await page.locator("[data-preview]").boundingBox())?.y ?? 0;
    const before = await top();
    await page
      .getByRole("dialog")
      .locator("[data-settings-scroll]")
      .evaluate((element) => element.scrollTo(0, 300));
    expect(await top()).toBeLessThan(before);
  });
});
