import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { passageRange } from "./helpers/passage.ts";
import { savedProfile, seedProfile } from "./helpers/profile.ts";
import { lettersOf, surah } from "./helpers/quran.ts";
import { startTyping, surface, typeKeys } from "./helpers/typing.ts";

const EMPTY_RUN = { correct: 0, total: 0, ms: 0 };

function card(page: Page) {
  return page.getByRole("dialog", { name: /complete$/ });
}

function field(page: Page) {
  return page.getByRole("textbox", { name: "Type the text shown" });
}

async function startKawthar(page: Page, settings: Record<string, unknown> = {}, extra: Record<string, unknown> = {}) {
  await seedProfile(page, { settings: { vocalization: "letters", ...settings }, ...extra });
  await page.goto("/#/recitation/108");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  await expect(field(page)).toBeFocused();
}

test("finishing a passage inside a surah opens the next one by itself: no summary, no dialog, the field stays focused", async ({
  page,
}) => {
  const fatiha = surah(1);
  await seedProfile(page, { settings: { vocalization: "letters" } });
  await page.goto("/#/recitation/1");
  await startTyping(page);
  const entries = await page.evaluate(() => history.length);
  await typeKeys(page, lettersOf(fatiha, 1, 4));
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  expect(await page.evaluate(() => history.length)).toBe(entries);
  await expect(passageRange(page, "Ayat 5 to 7 of 7")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /next passage|type again/i })).toHaveCount(0);
  await expect(field(page)).toBeFocused();
  const profile = await savedProfile(page);
  expect(profile.history).toHaveLength(1);
  expect(profile.recitation).toMatchObject({ position: { surah: 1, ayah: 5 } });
});

test("finishing a surah opens the celebration with its figures, a star for 95% or better, and Continue goes on", async ({
  page,
}) => {
  await startKawthar(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(card(page)).toBeVisible();
  await expect(card(page)).toHaveAccessibleName(/^\P{L}*Al-Kawthar\P{L}* complete$/u);
  await expect(card(page).getByText("Every ayah typed, well done.")).toBeVisible();
  await expect(card(page).getByText("1 of 114 surahs complete")).toBeVisible();
  await expect(card(page).getByText("95% accuracy or better")).toBeVisible();
  const figures = card(page).getByRole("term");
  await expect(figures).toHaveText(["Ayat", "Accuracy", "Speed", "Time"]);
  const values = card(page).getByRole("definition");
  await expect(values.nth(0)).toHaveText("3");
  await expect(values.nth(1)).toHaveText("100%");
  await expect(card(page).getByText("الكوثر")).toBeVisible();
  const next = card(page).getByRole("button", { name: /^Continue to / });
  await expect(next).toBeFocused();
  await expect(page.getByRole("heading", { level: 2, name: /^Completed/ })).toHaveCount(0);
  expect((await savedProfile(page)).recitation).toMatchObject({
    position: { surah: 109, ayah: 1 },
    surahs: { 108: { typed: [], completions: 1, run: EMPTY_RUN, best: 1 } },
  });
  await next.click();
  await expect(card(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(field(page)).toBeFocused();
});

test("below 95% there is no star, and a repeat completion says how many times the surah was typed", async ({
  page,
}) => {
  await startKawthar(
    page,
    { requireBackspace: false },
    { recitation: { surahs: { 108: { typed: [], completions: 1, run: EMPTY_RUN, best: 0.9 } } } },
  );
  const keys = lettersOf(surah(108), 1, 3, true);
  const wrong = new Set([2, 6, 10, 14, 18, 22, 26, 30]);
  const typed = keys.flatMap((key, index) => (wrong.has(index) ? ["ض", key] : [key]));
  await typeKeys(page, typed);
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByText("Completed 2 times.")).toBeVisible();
  await expect(card(page).getByText("95% accuracy or better")).toHaveCount(0);
  await expect(card(page).getByRole("definition").nth(1)).toHaveText(/^(8\d|9[0-4])%$/);
  const saved = (await savedProfile(page)).recitation as {
    surahs: Record<string, { completions: number; best: number }>;
  };
  expect(saved.surahs[108]?.completions).toBe(2);
  expect(saved.surahs[108]?.best).toBeGreaterThanOrEqual(0.9);
  expect(saved.surahs[108]?.best).toBeLessThan(0.95);
});

test("the rays burst without end while motion is welcome, and are not drawn when it is not", async ({ page }) => {
  await startKawthar(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  const rays = card(page).locator("[data-ray]");
  await expect(rays).toHaveCount(18);
  const first = await rays.first().evaluate((element) => {
    const style = getComputedStyle(element);
    return { name: style.animationName, count: style.animationIterationCount };
  });
  expect(first).toEqual({ name: "burst", count: "infinite" });
  const name = card(page).locator("[data-surah-name]");
  expect(await name.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe("infinite");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await rays.first().evaluate((element) => getComputedStyle(element).display)).toBe("none");
  expect(await name.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
});

test("Escape and Continue do the same; Type it again starts the surah over and counts the next finish", async ({
  page,
}) => {
  await startKawthar(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(card(page)).toBeVisible();
  await card(page).getByRole("button", { name: "Type it again" }).click();
  await expect(card(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/recitation\/108(\/1)?$/);
  await expect(field(page)).toBeFocused();
  await expect(surface(page).locator("[data-block]")).toHaveCount(2);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(card(page).getByText("Completed 2 times.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(card(page)).toHaveCount(0);
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(field(page)).toBeFocused();
});

test("the last surah of the order offers to start again instead", async ({ page }) => {
  await seedProfile(page, { settings: { vocalization: "letters", surahOrder: "mushaf" } });
  await page.goto("/#/recitation/114");
  await startTyping(page);
  await typeKeys(page, lettersOf(surah(114), 1, 4, true));
  await expect(page).toHaveURL(/#\/recitation\/114\/5$/);
  await typeKeys(page, lettersOf(surah(114), 5, 6));
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByText("This was the last surah in this order. Next, it starts again.")).toBeVisible();
  await card(page).getByRole("button", { name: "Start again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
});

test("the card has no accessibility violations, in English and in Arabic", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startKawthar(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(card(page)).toBeVisible();
  await expectNoAxeViolations(page);
});

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG" });

  test("the card is in Arabic and has no accessibility violations", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await seedProfile(page, { settings: { language: "ar", vocalization: "letters" } });
    await page.goto("/#/recitation/108");
    await page.locator("[data-typing-surface]").click();
    await typeKeys(page, lettersOf(surah(108), 1, 3, true));
    const arabic = page.getByRole("dialog", { name: /الكوثر/ });
    await expect(arabic).toBeVisible();
    await expect(arabic.getByRole("button", { name: /^المتابعة إلى / })).toBeFocused();
    await expectNoAxeViolations(page);
  });
});

test("on a phone the card is a sheet from the bottom with a full-width Continue", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await startKawthar(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(card(page)).toBeVisible();
  const box = await card(page).boundingBox();
  expect(box?.width).toBe(390);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBeCloseTo(844, 0);
  const next = await card(page)
    .getByRole("button", { name: /^Continue to / })
    .boundingBox();
  expect(next?.width ?? 0).toBeGreaterThan(300);
  expect(next?.height ?? 0).toBeGreaterThanOrEqual(44);
});
