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
  await expect(page.getByText("Ayat 13 to 16 of 83")).toBeVisible();
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
  const first = map(page).getByRole("list").or(map(page)).getByRole("link").first();
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
  await expect(page.getByText("Ayat 5 to 7 of 7")).toBeVisible();
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
  await expect(page.getByText("Ayat 255 to 258 of 286")).toBeVisible();
  await field.fill("999");
  await bar(page).getByRole("button", { name: "Go" }).click();
  await expect(page).toHaveURL(/#\/recitation\/2\/286$/);
  const progress = bar(page).getByRole("progressbar", { name: "12 of 286 ayat typed" });
  await expect(progress).toHaveAttribute("aria-valuenow", "12");
  await expect(progress).toHaveAttribute("aria-valuemax", "286");
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
  await expect(page.getByText("This was the last surah in this order. Next, it starts again.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Next passage" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
});

test("Settings offers ayat per passage and the surah order together, and a change applies at once", async ({
  page,
}) => {
  await page.goto("/#/recitation/1/1");
  await expect(page.getByText("Ayat 1 to 4 of 7")).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const group = dialog.getByRole("group", { name: "Recitation" });
  const select = group.getByRole("combobox", { name: "Ayat per passage" });
  await expect(select.getByRole("option")).toHaveCount(10);
  await expect(select).toHaveValue("4");
  await select.selectOption("2");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(page.getByText("Ayat 1 to 2 of 7")).toBeVisible();
  expect((await savedSettings(page)).ayatPerLesson).toBe(2);
  expect(await doneText(page)).toBe("");
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 10 });
});
