import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedProfile, seedSettings } from "./helpers/profile.ts";
import { doneText, shownText, surface, typeKeys } from "./helpers/typing.ts";

interface SurahFile {
  readonly number: number;
  readonly basmala: string | null;
  readonly ayat: readonly string[];
  readonly source: string;
}

declare global {
  interface Window {
    inputToPaint?: number[];
  }
}

const MARKS = /[\u064B-\u0652\u0670]/g;
const DAGGER_ALEF = "\u0670";
const NO_BREAK_SPACE = "\u00A0";
const END_OF_AYAH = "\u06DD";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const MEDIAN_BUDGET_MS = 50;
const SLOWEST_TENTH_BUDGET_MS = 100;
const UNREPORTED_MS = 8;

function surah(number: number): SurahFile {
  const name = `${String(number).padStart(3, "0")}.json`;
  return JSON.parse(readFileSync(new URL(`../generated/quran/${name}`, import.meta.url), "utf8"));
}

function sign(ayah: number): string {
  return `${END_OF_AYAH}${[...String(ayah)].map((digit) => ARABIC_DIGITS.charAt(Number(digit))).join("")}`;
}

function shownAyat(source: SurahFile, from: number, to: number): string {
  return source.ayat
    .slice(from - 1, to)
    .map((text, index) => `${text}${NO_BREAK_SPACE}${sign(from + index)}`)
    .join(" ");
}

function lettersOf(source: SurahFile, from: number, to: number, withBasmala = false): string[] {
  const opening = withBasmala && source.basmala !== null ? [source.basmala] : [];
  return [...[...opening, ...source.ayat.slice(from - 1, to)].join(" ").replace(MARKS, "")];
}

async function apparatus(page: Page): Promise<string[]> {
  return page.evaluate(() => [...(CSS.highlights.get("mafatih-apparatus") ?? [])].map((range) => range.toString()));
}

async function start(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start typing" }).click();
}

const finished = (page: Page) => page.getByRole("heading", { level: 2, name: "Finished" });
const completed = (page: Page) => page.getByRole("heading", { level: 2, name: /^Completed: / });

test("a surah opens at once, ready to type, with its first passage", async ({ page }) => {
  const fatiha = surah(1);
  await page.goto("/#/recitation/1");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Faatiha الفاتحة");
  await expect(page.getByText("Ayat 1 to 4 of 7")).toBeVisible();
  await expect(surface(page).locator("[data-block]")).toHaveCount(1);
  expect(await shownText(page)).toBe(shownAyat(fatiha, 1, 4));
  await expect(page.getByRole("button", { name: "Start typing" })).toBeVisible();
  await expectNoAxeViolations(page);
});

for (const [vocalization, typesMarks] of [
  ["auto", false],
  ["letters", false],
  ["harakat", true],
  ["full", true],
] as const) {
  test(`at ${vocalization} every character of the source, dagger alef included, is on screen`, async ({ page }) => {
    const fatiha = surah(1);
    expect(shownAyat(fatiha, 1, 4)).toContain(DAGGER_ALEF);
    await seedSettings(page, { vocalization });
    await page.goto("/#/recitation/1/1");
    await expect(surface(page)).toBeVisible();
    expect(await shownText(page)).toBe(shownAyat(fatiha, 1, 4));
    await start(page);
    await typeKeys(page, ["ب", "س"]);
    await expect(surface(page).locator("[data-mistakes]")).toHaveCount(typesMarks ? 1 : 0);
    expect(await doneText(page)).toBe(typesMarks ? "ب" : "بِسْ");
  });
}

test("the basmala is a centred block of its own, typed before the first ayah", async ({ page }) => {
  const ikhlas = surah(112);
  await page.goto("/#/recitation/112");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Ikhlaas الإخلاص");
  const blocks = surface(page).locator("[data-block]");
  await expect(blocks).toHaveCount(2);
  await expect(blocks.first()).toHaveText(ikhlas.basmala ?? "");
  await expect(blocks.first()).toHaveCSS("text-align", "center");
  await expect(blocks.last()).toHaveText(shownAyat(ikhlas, 1, 4));
  await expect(blocks.last()).not.toHaveCSS("text-align", "center");
  await start(page);
  const basmala = [...(ikhlas.basmala ?? "").replace(MARKS, "")];
  await typeKeys(page, basmala);
  expect(await doneText(page)).toBe(ikhlas.basmala);
  const caret = surface(page).locator("[data-caret]");
  await expect(caret).toBeVisible();
  const caretBox = await caret.boundingBox();
  const firstBlock = await blocks.first().boundingBox();
  expect(caretBox?.y ?? 0).toBeGreaterThanOrEqual((firstBlock?.y ?? 0) - 1);
  expect((caretBox?.y ?? 0) + (caretBox?.height ?? 0)).toBeLessThanOrEqual(
    (firstBlock?.y ?? 0) + (firstBlock?.height ?? 0) + 1,
  );
  await typeKeys(page, [" ", ...lettersOf(ikhlas, 1, 1)]);
  expect(await doneText(page)).toContain(ikhlas.ayat[0]);
  await expectNoAxeViolations(page);
});

test("the ayah signs are tinted as apparatus, never typed, and typing letters only completes the surah", async ({
  page,
}) => {
  const ikhlas = surah(112);
  await seedSettings(page, { vocalization: "letters" });
  await page.goto("/#/recitation/112");
  await expect(surface(page)).toBeVisible();
  expect(await apparatus(page)).toEqual([sign(1), sign(2), sign(3), sign(4)]);
  await start(page);
  const keys = lettersOf(ikhlas, 1, 4, true);
  expect(keys.join("")).not.toMatch(/[\u06DD\u0660-\u0669\u00A0]/);
  await typeKeys(page, keys.slice(0, 30));
  await typeKeys(page, ["ض"]);
  await expect(surface(page).locator("[data-mistakes]")).toBeVisible();
  expect(await apparatus(page)).toEqual([sign(1), sign(2), sign(3), sign(4)]);
  await typeKeys(page, ["Backspace", ...keys.slice(30)]);
  await expect(completed(page)).toBeFocused();
  const profile = await savedProfile(page);
  expect(profile.recitation).toEqual({
    position: { surah: 113, ayah: 1 },
    surahs: { 112: { typed: [], completions: 1 } },
  });
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the word announced next is a word of the text, never an ayah sign", async ({ page }) => {
  const ikhlas = surah(112);
  await seedSettings(page, { vocalization: "letters" });
  await page.goto("/#/recitation/112/1");
  await start(page);
  const next = surface(page).locator("p.sr-only[role=status]");
  const firstAyah = lettersOf(ikhlas, 1, 1, true);
  await expect(next).toHaveText("بِسْمِ");
  await typeKeys(page, firstAyah.slice(0, -1));
  await expect(next).toHaveText(ikhlas.ayat[0]?.split(" ").at(-1) ?? "");
  await typeKeys(page, firstAyah.slice(-1));
  await expect(next).toHaveText(ikhlas.ayat[1]?.split(" ")[0] ?? "");
});

test("progress is saved ayah by ayah, into recitation only, and a reload resumes after the last finished ayah", async ({
  page,
}) => {
  const fatiha = surah(1);
  await page.goto("/#/recitation/1");
  await start(page);
  await typeKeys(page, [...lettersOf(fatiha, 1, 2), " ", ...lettersOf(fatiha, 3, 3).slice(0, 4)]);
  const profile = await savedProfile(page);
  expect(profile.recitation).toEqual({
    position: { surah: 1, ayah: 3 },
    surahs: { 1: { typed: [[1, 2]], completions: 0 } },
  });
  expect(profile.ladder).toEqual({ unlocked: 10 });
  const stats = profile.stats as Record<string, Record<string, { attempts: number }>>;
  expect(stats.practice).toEqual({});
  expect(stats.custom).toEqual({});
  expect(stats.recitation?.ح?.attempts).toBe(3);
  expect(profile.history).toEqual([]);
  await page.reload();
  await expect(page.getByText("Ayat 3 to 6 of 7")).toBeVisible();
  expect(await shownText(page)).toBe(shownAyat(fatiha, 3, 6));
  expect(await doneText(page)).toBe("");
});

test("a finished passage shows its summary, ignores further keys, and Next passage follows the text across surahs", async ({
  page,
}) => {
  const fatiha = surah(1);
  await seedSettings(page, { vocalization: "letters" });
  await page.goto("/#/recitation/1");
  await start(page);
  const entries = await page.evaluate(() => history.length);
  await typeKeys(page, lettersOf(fatiha, 1, 4));
  await expect(finished(page)).toBeFocused();
  await expect(finished(page)).toHaveAccessibleDescription(/Speed.*Accuracy.*100%.*Mistakes.*0/);
  const summary = finished(page).locator("xpath=..");
  const next = summary.getByRole("button", { name: "Next passage" });
  await expect(next).toBeVisible();
  await expect(summary.getByRole("button", { name: "Type again" })).toBeVisible();
  await expectNoAxeViolations(page);
  const whenFinished = await savedProfile(page);
  await page.keyboard.insertText("ب");
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeDisabled();
  expect(await doneText(page)).toBe(shownAyat(fatiha, 1, 4));
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  expect(await savedProfile(page)).toEqual(whenFinished);
  const history = whenFinished.history as { mode: string; chars: number; accuracy: number }[];
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ mode: "recitation", chars: lettersOf(fatiha, 1, 4).length, accuracy: 1 });

  await next.click();
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  expect(await page.evaluate(() => history.length)).toBe(entries);
  await expect(page.getByText("Ayat 5 to 7 of 7")).toBeVisible();
  expect(await shownText(page)).toBe(shownAyat(fatiha, 5, 7));
  await expect(finished(page)).toHaveCount(0);
  const field = page.getByRole("textbox", { name: "Type the text shown" });
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription(
    `Al-Faatiha الفاتحة Ayat 5 to 7 of 7 ${fatiha.ayat[4]?.split(" ")[0]}`,
  );
  await typeKeys(page, lettersOf(fatiha, 5, 7));
  await expect(completed(page)).toBeFocused();
  expect((await savedProfile(page)).recitation).toEqual({
    position: { surah: 2, ayah: 1 },
    surahs: { 1: { typed: [], completions: 1 } },
  });

  await page.getByRole("button", { name: "Next surah" }).click();
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Baqara البقرة");
  await expect(surface(page).locator("[data-block]")).toHaveCount(2);
  await expect(field).toBeFocused();
  await expect(field).toHaveAccessibleDescription(/Al-Baqara.*Ayat 1 to 4 of 286/);

  await page.evaluate(() => {
    window.location.hash = "#/recitation/110";
  });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("An-Nasr النصر");
  await expect(surface(page)).toBeVisible();
  await expect(field).not.toBeFocused();
});

test("a lesson in progress survives another tab saving the profile", async ({ context }) => {
  const fatiha = surah(1);
  const page = await context.newPage();
  await page.goto("/#/recitation/1");
  await start(page);
  await typeKeys(page, [...lettersOf(fatiha, 1, 1), " ", ...lettersOf(fatiha, 2, 2).slice(0, 6)]);
  const typed = await doneText(page);
  expect(typed.length).toBeGreaterThan(20);
  const other = await context.newPage();
  await other.goto("/#/about");
  await other.evaluate(() => {
    const key = "mafatih:profile:2";
    localStorage.setItem(key, JSON.stringify(JSON.parse(localStorage.getItem(key) ?? "{}"), null, 1));
  });
  await page.bringToFront();
  await page.keyboard.insertText(lettersOf(fatiha, 2, 2)[6] ?? "");
  expect((await doneText(page)).length).toBeGreaterThan(typed.length);
});

test("while a surah loads a status says so, and the same region is left empty afterwards", async ({ page }) => {
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/assets\/036-[^/]*\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/#/recitation/36");
  const status = page.getByRole("main").getByRole("status").first();
  await expect(status).toHaveText("Loading the surah…");
  const region = await status.elementHandle();
  release();
  await expect(surface(page)).toBeVisible();
  expect(await region?.evaluate((element) => element.isConnected && element.textContent === "")).toBe(true);
});

test("with forced colours the typed text and the ayah signs are still told apart from the text to come", async ({
  page,
}) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/#/recitation/112");
  await expect(surface(page)).toBeVisible();
  const colours = await surface(page)
    .locator("[data-block]")
    .last()
    .evaluate((block) => ({
      text: getComputedStyle(block).color,
      done: getComputedStyle(block, "::highlight(mafatih-done)").color,
      sign: getComputedStyle(block, "::highlight(mafatih-apparatus)").color,
    }));
  expect(colours.done).not.toBe(colours.text);
  expect(colours.sign).not.toBe(colours.text);
});

test("Type again starts the same passage over", async ({ page }) => {
  const kawthar = surah(108);
  await seedSettings(page, { vocalization: "letters", requireBackspace: false });
  await page.goto("/#/recitation/108");
  await start(page);
  const keys = lettersOf(kawthar, 1, 3, true);
  await typeKeys(page, ["ض", ...keys]);
  await expect(completed(page)).toHaveAccessibleDescription(/Mistakes.*1/);
  await page.getByRole("button", { name: "Type again" }).click();
  await expect(completed(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/recitation\/108$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
  expect(await doneText(page)).toBe("");
  await typeKeys(page, keys);
  await expect(completed(page)).toHaveAccessibleDescription(/Mistakes.*0/);
  const profile = await savedProfile(page);
  expect(profile.recitation).toMatchObject({ surahs: { 108: { typed: [], completions: 2 } } });
  expect(profile.history).toHaveLength(2);
});

test("an address past the end of a surah shows its last ayah, and a single ayah is named as one", async ({ page }) => {
  await seedSettings(page, { ayatPerLesson: 1 });
  await page.goto("/#/recitation/1/99");
  await expect(page.getByText("Ayah 7 of 7")).toBeVisible();
  expect(await shownText(page)).toBe(shownAyat(surah(1), 7, 7));
});

test("in the Arabic interface the surah has its Arabic name only and the page reads right to left", async ({
  page,
}) => {
  await seedSettings(page, { language: "ar" });
  await page.goto("/#/recitation/36/21");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("يس");
  await expect(page.getByText("الآيات ٢١ إلى ٢٤ من ٨٣")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("[data-lesson-text]")).toHaveText(shownAyat(surah(36), 21, 24));
  await expectNoAxeViolations(page);
});

test("a surah that cannot be loaded says so and offers to reload, which then works", async ({ page }) => {
  await page.route(/assets\/036-[^/]*\.js$/, (route) => route.abort());
  await page.goto("/#/recitation/36");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yaseen يس");
  await expect(page.getByRole("alert")).toHaveText("The surah could not be loaded. Check your connection and reload.");
  await expect(surface(page)).toHaveCount(0);
  await expectNoAxeViolations(page);
  await page.unroute(/assets\/036-[^/]*\.js$/);
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(surface(page)).toBeVisible();
  expect(await shownText(page)).toBe(`${surah(36).basmala} ${shownAyat(surah(36), 1, 4)}`);
});

test("the longest ayah renders, keeps the caret line in view, stays fast to type and completes", async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  const baqara = surah(2);
  const keys = lettersOf(baqara, 282, 282);
  const measured = 160;
  await seedSettings(page, { ayatPerLesson: 1, vocalization: "letters" });
  await page.goto("/#/recitation/2/282");
  await expect(page.getByText("Ayah 282 of 286")).toBeVisible();
  expect(await shownText(page)).toBe(shownAyat(baqara, 282, 282));
  await start(page);
  await page.evaluate(() => {
    const options: PerformanceObserverInit & { durationThreshold: number } = { type: "event", durationThreshold: 16 };
    window.inputToPaint = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === "input") {
          window.inputToPaint?.push(entry.duration);
        }
      }
    }).observe(options);
  });
  const throttled = testInfo.project.name === "chromium-mobile";
  const session = await page.context().newCDPSession(page);
  if (throttled) {
    await session.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  }
  for (const key of keys.slice(0, measured)) {
    await page.keyboard.insertText(key);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))));
  }
  await session.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  const slow = await page.evaluate(() => window.inputToPaint ?? []);
  const unreported = Math.max(0, measured - slow.length);
  const durations = [...slow, ...Array.from({ length: unreported }, () => UNREPORTED_MS)].sort((a, b) => a - b);
  expect(durations.length).toBeGreaterThanOrEqual(measured);
  expect(durations[Math.floor(durations.length / 2)]).toBeLessThan(MEDIAN_BUDGET_MS);
  expect(durations[Math.floor(durations.length * 0.9)]).toBeLessThan(SLOWEST_TENTH_BUDGET_MS);

  await typeKeys(page, keys.slice(measured, 450));
  const caret = surface(page).locator("[data-caret]");
  await expect(caret).toBeInViewport({ ratio: 1 });
  const caretBox = await caret.boundingBox();
  const textBox = await surface(page).locator("[data-lesson-text]").boundingBox();
  expect(caretBox?.y ?? 0).toBeGreaterThanOrEqual(textBox?.y ?? 0);
  expect((caretBox?.y ?? 0) + (caretBox?.height ?? 0)).toBeLessThanOrEqual((textBox?.y ?? 0) + (textBox?.height ?? 0));
  await typeKeys(page, keys.slice(450));
  await expect(finished(page)).toBeFocused();
  expect((await savedProfile(page)).recitation).toMatchObject({ surahs: { 2: { typed: [[282, 282]] } } });
});

test("a passage too long for its box can be scrolled from the keyboard, a short one adds no tab stop", async ({
  page,
}) => {
  await seedSettings(page, { ayatPerLesson: 1, fontSize: 72 });
  await page.goto("/#/recitation/2/282");
  const text = surface(page).locator("[data-lesson-text]");
  await expect(text).toBeVisible();
  const overflows = await text.evaluate((element) => element.scrollHeight > element.clientHeight);
  expect(overflows).toBe(true);
  await expect(text).toHaveAttribute("tabindex", "0");
  await expectNoAxeViolations(page);
  await page.goto("/#/recitation/112");
  await expect(surface(page).locator("[data-lesson-text]")).toBeVisible();
  await expect(surface(page).locator("[data-lesson-text]")).not.toHaveAttribute("tabindex", /.*/);
});
