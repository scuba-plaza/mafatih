import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedProfile, savedSettings, seedProfile } from "./helpers/profile.ts";
import { doneText, surface, typeKeys } from "./helpers/typing.ts";

interface SurahFile {
  readonly number: number;
  readonly basmala: string | null;
  readonly ayat: readonly string[];
}

interface SurahMeta {
  readonly n: number;
  readonly name: string;
  readonly tname: string;
  readonly ayat: number;
}

const MARKS = /[\u064B-\u0652\u0670]/g;
const METAS: readonly SurahMeta[] = JSON.parse(readFileSync(new URL("../data/surahs.json", import.meta.url), "utf8"));

function surah(number: number): SurahFile {
  const name = `${String(number).padStart(3, "0")}.json`;
  return JSON.parse(readFileSync(new URL(`../generated/quran/${name}`, import.meta.url), "utf8"));
}

function meta(number: number): SurahMeta {
  const found = METAS.find((entry) => entry.n === number);
  if (found === undefined) {
    throw new Error(`no surah ${number}`);
  }
  return found;
}

function lettersOf(source: SurahFile, from: number, to: number, withBasmala = false): string[] {
  const opening = withBasmala && source.basmala !== null ? [source.basmala] : [];
  return [...[...opening, ...source.ayat.slice(from - 1, to)].join(" ").replace(MARKS, "")];
}

function map(page: Page) {
  return page.getByRole("list", { name: "Surahs" });
}

function bar(page: Page) {
  return page.getByRole("group", { name: "Passage" });
}

const finished = (page: Page) => page.getByRole("heading", { level: 2, name: "Finished" });
const completed = (page: Page) => page.getByRole("heading", { level: 2, name: /^Completed: / });

test("the home page is a map of all 114 surahs, each a link that says how much of it is typed", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
  await expect(map(page).getByRole("link")).toHaveCount(114);
  await expect(page.getByRole("link", { name: /^Start with .*Al-Faatiha/ })).toHaveAttribute(
    "href",
    "#/recitation/1/1",
  );
  await expect(map(page).getByRole("link", { name: /Yaseen.*83 ayat/ })).toBeVisible();
  await expect(surface(page)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("the map shows progress in words and a ring, a completed surah says so, and Continue resumes", async ({
  page,
}) => {
  await seedProfile(page, {
    recitation: {
      position: { surah: 36, ayah: 13 },
      surahs: { 36: { typed: [[1, 12]], completions: 0 }, 112: { typed: [], completions: 2 } },
    },
  });
  await page.goto("/");
  await expect(map(page).getByRole("link", { name: /Yaseen.*12 of 83 ayat typed/ })).toBeVisible();
  const completed = map(page).getByRole("link", { name: /Al-Ikhlaas/ });
  await expect(completed).toContainText("Completed: 2");
  await expect(
    map(page)
      .getByRole("link", { name: /Yaseen/ })
      .locator("svg[aria-hidden=true]"),
  ).toHaveCount(1);
  const resume = page.getByRole("link", { name: /^Continue with .*Yaseen.*, ayah 13/ });
  await expect(resume).toHaveAttribute("href", "#/recitation/36/13");
  await map(page)
    .getByRole("link", { name: /Yaseen/ })
    .click();
  await expect(page).toHaveURL(/#\/recitation\/36$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yaseen يس");
  await expect(page.getByText("Ayat 13 to 16 of 83", { exact: true })).toBeVisible();
});

test("the order setting puts the map in Mushaf order or with Juz ʿAmma first", async ({ page }) => {
  await page.goto("/");
  await expect(map(page).getByRole("link").first()).toContainText("Al-Faatiha");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const group = dialog.getByRole("group", { name: "Surah order" });
  await expect(group.getByRole("radio", { name: "Mushaf order" })).toBeChecked();
  await group.getByRole("radio", { name: "Juz ʿAmma first" }).check();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(map(page).getByRole("link").first()).toContainText(meta(114).tname);
  await expect(page.getByRole("link", { name: new RegExp(`^Start with .*${meta(114).tname}`) })).toBeVisible();
  expect((await savedSettings(page)).surahOrder).toBe("juz-amma");
});

test("in the Arabic interface only the Arabic names show", async ({ page }) => {
  await seedProfile(page, { settings: { language: "ar" } });
  await page.goto("/");
  const first = page.getByRole("list", { name: "السور" }).getByRole("link").first();
  await expect(first).toContainText(meta(1).name);
  await expect(first).not.toContainText("Al-Faatiha");
  await expectNoAxeViolations(page);
});

test("the passage bar goes to the previous or next passage, across surahs, by button or Page Up and Page Down", async ({
  page,
}) => {
  await page.goto("/#/recitation/1/5");
  await expect(bar(page)).toBeVisible();
  await bar(page).getByRole("button", { name: "Next passage" }).click();
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Baqara البقرة");
  await expect(bar(page).getByRole("button", { name: "Next passage" })).toBeFocused();
  await bar(page).getByRole("button", { name: "Previous passage" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  await bar(page).getByRole("button", { name: "Next passage" }).focus();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  await expect(page.getByText("Ayat 5 to 7 of 7", { exact: true })).toBeVisible();
});

test("Go to ayah is a labelled number field; a number outside the surah is brought into it; progress is in words", async ({
  page,
}) => {
  await seedProfile(page, { recitation: { position: null, surahs: { 2: { typed: [[1, 12]], completions: 0 } } } });
  await page.goto("/#/recitation/2/20");
  const field = bar(page).getByRole("spinbutton", { name: "Go to ayah" });
  await field.fill("255");
  await field.press("Enter");
  await expect(page).toHaveURL(/#\/recitation\/2\/255$/);
  await expect(page.getByText("Ayat 255 to 258 of 286", { exact: true })).toBeVisible();
  await field.fill("999");
  await bar(page).getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(/#\/recitation\/2\/286$/);
  const progress = bar(page).getByRole("progressbar", { name: "12 of 286 ayat typed" });
  await expect(progress).toHaveJSProperty("value", 12);
  await expect(progress).toHaveJSProperty("max", 286);
  await expect(bar(page).getByText("12 of 286 ayat typed")).toBeVisible();
  await expectNoAxeViolations(page);
});

test("a first-time visitor is told in one line what is typed and what is not, without the layout moving", async ({
  page,
}) => {
  await page.goto("/#/recitation/112");
  const none = page.getByText("Type the letters. Marks and ayah numbers are shown but not typed.");
  await expect(none).toBeVisible();
  const before = await none.boundingBox();
  await expect(surface(page)).toBeVisible();
  const after = await none.boundingBox();
  expect(after?.y).toBe(before?.y);
  await seedProfile(page, { settings: { vocalization: "full" } });
  await page.reload();
  await expect(
    page.getByText("Type the letters and the marks your settings ask for. Everything else is shown but not typed."),
  ).toBeVisible();
});

test("finishing a surah brings a quiet panel with its figures and Next surah, and nothing else", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  const heading = page.getByRole("heading", { level: 2, name: /^Completed: .*Al-Kawthar/ });
  await expect(heading).toBeFocused();
  const panel = heading.locator("xpath=..");
  await expect(panel.getByText("Ayat")).toBeVisible();
  await expect(panel.getByText("Times completed")).toBeVisible();
  await expect(panel.getByText("Time", { exact: true })).toBeVisible();
  await expect(panel.getByText("Accuracy")).toBeVisible();
  await expect(panel.getByRole("button", { name: "Type again" })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expectNoAxeViolations(page);
  await panel.getByRole("button", { name: "Next surah" }).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
});

test("after the last surah of the order the panel says the order starts again, and so does its button", async ({
  page,
}) => {
  const naas = surah(114);
  await seedProfile(page, {
    recitation: { position: { surah: 114, ayah: 6 }, surahs: { 114: { typed: [[1, 5]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/114/6");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(naas, 6, 6));
  await expect(page.getByText("This was the last surah in this order. Next, it starts again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next surah" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
});

test("a passage that ends the order without completing the surah also says it starts again", async ({ page }) => {
  const naas = surah(114);
  await seedProfile(page, { settings: { vocalization: "letters", ayatPerLesson: 1 } });
  await page.goto("/#/recitation/114/6");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(naas, 6, 6));
  await expect(finished(page)).toBeFocused();
  const summary = finished(page).locator("xpath=..");
  await expect(summary.getByText("This was the last surah in this order. Next, it starts again.")).toBeVisible();
  await expect(summary.getByRole("button", { name: "Next passage" })).toHaveCount(0);
  await summary.getByRole("button", { name: "Start again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
});

test("Settings offers ayat per passage and the surah order together, and a change applies at once", async ({
  page,
}) => {
  await page.goto("/#/recitation/1/1");
  await expect(page.getByText("Ayat 1 to 4 of 7", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const group = dialog.getByRole("group", { name: "Recitation" });
  const select = group.getByRole("combobox", { name: "Ayat per passage" });
  await expect(select.getByRole("option")).toHaveCount(4);
  await expect(select).toHaveValue("4");
  await select.selectOption("2");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Ayat 1 to 2 of 7", { exact: true })).toBeVisible();
  expect((await savedSettings(page)).ayatPerLesson).toBe(2);
  expect(await doneText(page)).toBe("");
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 10 });
});

test("Go to ayah keeps the focus in the field, writes back the number it used and says when it cannot use the input", async ({
  page,
}) => {
  await page.goto("/#/recitation/2/20");
  const field = bar(page).getByRole("spinbutton", { name: "Go to ayah" });
  await field.fill("255");
  await field.press("Enter");
  await expect(page).toHaveURL(/#\/recitation\/2\/255$/);
  await expect(field).toBeFocused();
  await expect(field).toHaveValue("255");
  for (const [typed, ayah] of [
    ["0", 1],
    ["-3", 1],
    ["1.5", 1],
    ["1e2", 100],
    ["99999999999999999999", 286],
  ] as const) {
    await field.fill(typed);
    await field.press("Enter");
    await expect(page).toHaveURL(new RegExp(`#/recitation/2/${ayah}$`));
    await expect(field, typed).toHaveValue(String(ayah));
    await expect(field, typed).toBeFocused();
  }
  await field.fill("");
  await field.press("Enter");
  await expect(bar(page).getByRole("alert")).toHaveText("Enter a number from 1 to 286.");
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription("Enter a number from 1 to 286.");
  await field.fill("5");
  await field.press("Enter");
  await expect(bar(page).getByRole("alert")).toHaveCount(0);
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
});

test("Next surah puts the focus in the typing field once; later moves from the bar leave it where it is", async ({
  page,
}) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await page.getByRole("button", { name: "Next surah" }).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
  await bar(page).getByRole("button", { name: "Next passage" }).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/2$/);
  await bar(page).getByRole("button", { name: "Previous passage" }).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(bar(page).getByRole("button", { name: "Previous passage" })).toBeFocused();
});

test("moving to another passage from the bar is announced politely with the new range", async ({ page }) => {
  await page.goto("/#/recitation/1/1");
  await expect(surface(page)).toBeVisible();
  const announced = page.getByRole("status").filter({ hasText: "Ayat 5 to 7 of 7" });
  await expect(announced).toHaveCount(0);
  await bar(page).getByRole("button", { name: "Next passage" }).click();
  await expect(announced).toHaveCount(1);
  await expect(announced).toContainText("Al-Faatiha");
});

test("retyping the last passage of a surah completed earlier ends with Finished, not Completed", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 1 }, surahs: { 108: { typed: [], completions: 1 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(finished(page)).toBeFocused();
  await expect(completed(page)).toHaveCount(0);
});

test("Type again after a completed surah starts a fresh count: a partial retype is only Finished", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(completed(page)).toBeFocused();
  await page.getByRole("button", { name: "Type again" }).click();
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(finished(page)).toBeFocused();
  await expect(completed(page)).toHaveCount(0);
});

test("a surah finished from the middle of its passage hands on to the next surah, not to the passage after it", async ({
  page,
}) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: null, surahs: { 108: { typed: [[2, 3]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/1");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, lettersOf(kawthar, 1, 1, true));
  await expect(completed(page)).toBeFocused();
  await page.getByRole("button", { name: "Next surah" }).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
});

test("another tab finishing the surah does not make a partial passage here read as completed", async ({ context }) => {
  const kawthar = surah(108);
  const page = await context.newPage();
  await seedProfile(page, { settings: { vocalization: "letters", ayatPerLesson: 1 } });
  await page.goto("/#/recitation/108/1");
  await page.getByRole("button", { name: "Start typing" }).click();
  const other = await context.newPage();
  await other.goto("/#/about");
  await other.evaluate(() => {
    const key = "mafatih:profile:2";
    const profile = JSON.parse(localStorage.getItem(key) ?? "{}");
    profile.recitation = { position: null, surahs: { 108: { typed: [], completions: 1 } } };
    localStorage.setItem(key, JSON.stringify(profile));
  });
  await page.bringToFront();
  await page.waitForTimeout(300);
  await page.getByRole("textbox", { name: "Type the text shown" }).focus();
  await typeKeys(page, lettersOf(kawthar, 1, 1, true));
  await expect(finished(page)).toBeFocused();
  await expect(completed(page)).toHaveCount(0);
});

test("on the home page Tab goes from Settings to the Start link and then through the surahs in order", async ({
  page,
}) => {
  await page.goto("/");
  await expect(map(page).getByRole("link")).toHaveCount(114);
  const focused = () =>
    page.evaluate(() => ({
      text: document.activeElement?.textContent ?? "",
      outline: getComputedStyle(document.activeElement ?? document.body).outlineStyle,
    }));
  for (let step = 0; step < 6; step += 1) {
    await page.keyboard.press("Tab");
  }
  expect((await focused()).text).toBe("Settings");
  await page.keyboard.press("Tab");
  expect(await focused()).toMatchObject({ outline: "solid" });
  expect((await focused()).text).toMatch(/^Start with .*Al-Faatiha/);
  await page.keyboard.press("Tab");
  expect((await focused()).text).toContain("Al-Faatiha");
  await page.keyboard.press("Tab");
  expect((await focused()).text).toContain("Al-Baqara");
});

test("with forced colours the ring's arc and track use system colours and differ", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await seedProfile(page, { recitation: { position: null, surahs: { 36: { typed: [[1, 12]], completions: 0 } } } });
  await page.goto("/");
  const circles = map(page)
    .getByRole("link", { name: /Yaseen/ })
    .locator("svg circle");
  const strokes = await circles.evaluateAll((elements) => elements.map((element) => getComputedStyle(element).stroke));
  expect(strokes).toHaveLength(2);
  expect(strokes[0]).not.toBe(strokes[1]);
  expect(strokes[1]).not.toBe("rgb(15, 118, 110)");
});

test("while a surah loads the room for its lesson is kept, so the bar does not jump under a finger", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  let release = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(/assets\/036-[^/]*\.js$/, async (route) => {
    await held;
    await route.continue();
  });
  await page.goto("/#/recitation/36");
  await expect(bar(page)).toBeVisible();
  const loading = await bar(page).boundingBox();
  expect(loading?.y ?? 0).toBeGreaterThan(800 * 0.3);
  release();
  await expect(surface(page)).toBeVisible();
});
