import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedProfile, seedProfile } from "./helpers/profile.ts";
import { doneText, shownText, surface, typeKeys } from "./helpers/typing.ts";

const MARKS = /[\u064B-\u0652\u0670]/g;
const HOME_ROW = new Set([..."ايملبتنسكش"]);
const ONE_SAMPLE_SHORT = { attempts: 7, hits: 7, timed: 7, meanMs: 400, recentAccuracy: 1 };

function keysOf(shown: string): string[] {
  return [...shown.replace(MARKS, "")];
}

function hud(page: Page) {
  return page.getByRole("region", { name: "Your progress" });
}

async function start(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start typing" }).click();
}

async function typeLesson(page: Page): Promise<string> {
  const before = await shownText(page);
  await typeKeys(page, keysOf(before));
  await expect.poll(() => shownText(page)).not.toBe(before);
  return before;
}

test("a fresh learner gets a lesson of home-row words at once, marks visible, and a progress readout", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await expect(page.getByText("Practice uses everyday words, not the Qur'an.")).toBeVisible();
  await expect(surface(page)).toBeVisible();
  const shown = await shownText(page);
  expect(shown.split(" ").length).toBeGreaterThanOrEqual(3);
  expect(shown).toMatch(MARKS);
  expect([...shown.replace(MARKS, "")].every((char) => char === " " || HOME_ROW.has(char))).toBe(true);
  await expect(hud(page).getByText("10 of 44")).toBeVisible();
  await expect(hud(page).getByText("ش")).toBeVisible();
  await expect(hud(page).getByText("Not yet")).toHaveCount(3);
  await expectNoAxeViolations(page);
});

test("a finished lesson is saved into Practice only, and the next lesson is already there to type on", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await start(page);
  const first = await typeLesson(page);
  const next = await shownText(page);
  expect(next).not.toBe(first);
  await expect(hud(page).getByText(/^\d[\d,]* characters per minute, \P{L}*100%\P{L}* accurate$/u)).toBeVisible();
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await typeKeys(page, keysOf(next).slice(0, 3));
  expect((await doneText(page)).length).toBeGreaterThan(0);
  const profile = await savedProfile(page);
  const stats = profile.stats as Record<string, Record<string, { attempts: number }>>;
  expect(Object.keys(stats.practice ?? {}).length).toBeGreaterThan(3);
  expect(stats.recitation).toEqual({});
  expect(stats.custom).toEqual({});
  const history = profile.history as { mode: string; accuracy: number; chars: number }[];
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({ mode: "practice", accuracy: 1 });
  expect(history[0]?.chars).toBeGreaterThanOrEqual(38);
});

test("the newest key's accuracy and time are shown", async ({ page }) => {
  const stat = { attempts: 20, hits: 19, timed: 19, meanMs: 520, recentAccuracy: 0.96 };
  await seedProfile(page, { stats: { practice: { ش: stat } } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("96%")).toBeVisible();
  await expect(hud(page).getByText("520 ms")).toBeVisible();
});

test("mastering the newest key unlocks the next one: announced once, quietly, and gone after the next lesson", async ({
  page,
}) => {
  await seedProfile(page, { stats: { practice: { ش: ONE_SAMPLE_SHORT } } });
  await page.goto("/#/practice");
  await start(page);
  const status = hud(page).getByRole("status");
  await expect(status).toHaveText("");
  await status.evaluate((element) => {
    const heard: string[] = [];
    Object.assign(window, { heard });
    new MutationObserver(() => heard.push(element.textContent ?? "")).observe(element, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  });
  for (let lesson = 0; lesson < 6 && (await status.textContent()) === ""; lesson += 1) {
    await typeLesson(page);
  }
  await expect(status).toHaveText(/^Unlocked: \P{L}*ر\P{L}*$/u);
  await expect(hud(page).getByText("11 of 44")).toBeVisible();
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 11 });
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await typeLesson(page);
  await expect(status).toHaveText("");
  await expect(hud(page).getByText("11 of 44")).toBeVisible();
  const heard = await page.evaluate(() => (window as unknown as { heard: string[] }).heard);
  expect(heard.filter((text) => text !== "")).toHaveLength(1);
});

test("after Reset progress the readout forgets the last lesson and its unlock", async ({ page }) => {
  await seedProfile(page, { stats: { practice: { ش: ONE_SAMPLE_SHORT } } });
  await page.goto("/#/practice");
  await start(page);
  const status = hud(page).getByRole("status");
  for (let lesson = 0; lesson < 6 && (await status.textContent()) === ""; lesson += 1) {
    await typeLesson(page);
  }
  await expect(status).toHaveText(/^Unlocked:/);
  await expect(hud(page).getByText(/characters per minute/)).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Reset progress" }).click();
  await dialog.getByRole("group", { name: "Reset progress?" }).getByRole("button", { name: "Reset" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(hud(page).getByText("10 of 44")).toBeVisible();
  await expect(status).toHaveText("");
  await expect(hud(page).getByText(/characters per minute/)).toHaveCount(0);
  await expect(hud(page).getByText("Not yet")).toHaveCount(3);
});

test("another tab saving the profile does not rebuild the lesson being typed", async ({ context }) => {
  const page = await context.newPage();
  await page.goto("/#/practice");
  await start(page);
  await typeKeys(page, keysOf(await shownText(page)).slice(0, 4));
  const typed = await doneText(page);
  expect(typed.length).toBeGreaterThan(0);
  const other = await context.newPage();
  await other.goto("/#/about");
  await other.evaluate(() => {
    const key = "mafatih:profile:2";
    localStorage.setItem(key, JSON.stringify(JSON.parse(localStorage.getItem(key) ?? "{}"), null, 1));
  });
  await page.bringToFront();
  await page.waitForTimeout(200);
  expect(await doneText(page)).toBe(typed);
});

test("a key tried but never typed within the time limit shows no time yet", async ({ page }) => {
  const missed = { attempts: 3, hits: 0, timed: 0, meanMs: 0, recentAccuracy: 0 };
  await seedProfile(page, { stats: { practice: { ش: missed } } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("0%")).toBeVisible();
  await expect(hud(page).getByText("0 ms")).toHaveCount(0);
  await expect(hud(page).getByText("Not yet")).toHaveCount(2);
});

test("a newest key that is a mark is shown with its name", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 37 } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("37 of 44")).toBeVisible();
  await expect(hud(page).getByText("fatha", { exact: true })).toBeVisible();
});

test("a learner who has every key is told so", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 44 } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("44 of 44")).toBeVisible();
  await expect(hud(page).getByText("All keys are unlocked.")).toBeVisible();
  await expect(surface(page)).toBeVisible();
});

test("when the newest key is a mark that this level does not type, the readout says so instead of naming a key", async ({
  page,
}) => {
  await seedProfile(page, { ladder: { unlocked: 37 }, settings: { vocalization: "letters" } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("37 of 44")).toBeVisible();
  await expect(
    hud(page).getByText("The remaining keys are marks, and marks are not typed at this level."),
  ).toBeVisible();
  await expect(hud(page).getByText("Newest key")).toHaveCount(0);
  await seedProfile(page, { ladder: { unlocked: 42 }, settings: { vocalization: "harakat" } });
  await page.reload();
  await expect(hud(page).getByText("42 of 44")).toBeVisible();
  await expect(
    hud(page).getByText("The remaining keys are marks, and marks are not typed at this level."),
  ).toBeVisible();
});

test("changing the vocalization builds a new lesson", async ({ page }) => {
  await page.goto("/#/practice");
  await start(page);
  await typeKeys(page, [...keysOf(await shownText(page))].slice(0, 2));
  expect((await doneText(page)).length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("radio", { name: "Full", exact: true }).check();
  await page.getByRole("dialog", { name: "Settings" }).getByRole("button", { name: "Done" }).click();
  expect(await doneText(page)).toBe("");
});

test("Reset progress asks first, then clears keys, statistics and lesson history but not settings or the place in the Qur'an", async ({
  page,
}) => {
  const recitation = { position: { surah: 36, ayah: 5 }, surahs: { 36: { typed: [[1, 4]], completions: 0 } } };
  const stat = { attempts: 9, hits: 9, timed: 9, meanMs: 300, recentAccuracy: 1 };
  await seedProfile(page, {
    ladder: { unlocked: 20 },
    stats: { practice: { ش: stat }, recitation: { ب: stat }, custom: {} },
    recitation,
    history: [{ at: 1_700_000_000_000, mode: "recitation", chars: 120, ms: 60_000, accuracy: 0.98 }],
    settings: { fontSize: 56 },
  });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("20 of 44")).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Reset progress" }).click();
  const group = dialog.getByRole("group", { name: "Reset progress?" });
  await expect(group).toHaveAccessibleDescription(/unlocked keys, your key statistics and your lesson history/);
  const keep = group.getByRole("button", { name: "Keep my progress" });
  await expect(keep).toBeFocused();
  await keep.click();
  await expect(group).toHaveCount(0);
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 20 });
  expect((await savedProfile(page)).history).toHaveLength(1);
  await dialog.getByRole("button", { name: "Reset progress" }).click();
  await dialog.getByRole("group", { name: "Reset progress?" }).getByRole("button", { name: "Reset" }).click();
  await expect(dialog.getByRole("status")).toHaveText("Progress was reset.");
  await expect(dialog.getByRole("button", { name: "Reset progress" })).toBeFocused();
  const profile = await savedProfile(page);
  expect(profile.ladder).toEqual({ unlocked: 10 });
  expect(profile.stats).toEqual({ practice: {}, recitation: {}, custom: {} });
  expect(profile.history).toEqual([]);
  expect(profile.recitation).toEqual(recitation);
  expect((profile.settings as { fontSize: number }).fontSize).toBe(56);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(hud(page).getByText("10 of 44")).toBeVisible();
  const shown = await shownText(page);
  expect([...shown.replace(MARKS, "")].every((char) => char === " " || HOME_ROW.has(char))).toBe(true);
});

test("the word list failing to load is said plainly, with a way to try again", async ({ page }) => {
  await page.route(/assets\/words-[^/]*\.js$/, (route) => route.abort());
  await page.goto("/#/practice");
  await expect(page.getByRole("alert")).toHaveText("The words could not be loaded. Check your connection and reload.");
  await expect(surface(page)).toHaveCount(0);
  await expectNoAxeViolations(page);
  await page.unroute(/assets\/words-[^/]*\.js$/);
  await page.getByRole("button", { name: "Reload" }).click();
  await expect(surface(page)).toBeVisible();
});

test("the readout is compact on a narrow screen and nothing scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seedProfile(page, { stats: { practice: { ش: ONE_SAMPLE_SHORT } } });
  await page.goto("/#/practice");
  await expect(hud(page)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const box = await hud(page).boundingBox();
  expect(box?.height ?? 999).toBeLessThan(160);
  await expectNoAxeViolations(page);
});

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG" });

  test("the page, the readout and the digits are Arabic", async ({ page }) => {
    await seedProfile(page, { settings: { language: "ar" } });
    await page.goto("/#/practice");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("التمرين");
    await expect(page.getByRole("region", { name: "تقدّمك" }).getByText("١٠ من ٤٤")).toBeVisible();
    await expectNoAxeViolations(page);
  });
});
