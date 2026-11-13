import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { passageRange } from "./helpers/passage.ts";
import { savedProfile, savedSettings, seedProfile } from "./helpers/profile.ts";
import { doneText, startTyping, surface, typeKeys } from "./helpers/typing.ts";

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

const card = (page: Page) => page.getByRole("dialog", { name: /complete$/ });
const continueButton = (page: Page) => card(page).getByRole("button", { name: /^Continue to / });

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

test("the map shows progress in words and a thin line, a completed surah says so, and Continue resumes", async ({
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
      .locator("div[aria-hidden=true]"),
  ).toHaveCount(1);
  await expect(
    map(page)
      .getByRole("link", { name: /Al-Faatiha/ })
      .locator("div[aria-hidden=true]"),
  ).toHaveCount(0);
  const resume = page.getByRole("link", { name: /^Continue with .*Yaseen.*, ayah 13/ });
  await expect(resume).toHaveAttribute("href", "#/recitation/36/13");
  await map(page)
    .getByRole("link", { name: /Yaseen/ })
    .click();
  await expect(page).toHaveURL(/#\/recitation\/36$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Yaseen · 13–16");
  await expect(passageRange(page, "Ayat 13 to 16 of 83")).toHaveCount(1);
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

test("the ayat counts on the map are written as Arabic counts them: آيات from 3 to 10, آية from 11", async ({
  page,
}) => {
  await seedProfile(page, { settings: { language: "ar" } });
  await page.goto("/");
  const links = page.getByRole("list", { name: "السور" }).getByRole("link");
  await expect(links.nth(0)).toContainText("٧ آيات");
  await expect(links.nth(1)).toContainText("٢٨٦ آية");
});

test("Page Down and Page Up in the footer go to the next and previous passage, across surahs, and keep the focus", async ({
  page,
}) => {
  await page.goto("/#/recitation/1/5");
  await expect(bar(page)).toBeVisible();
  const play = bar(page).getByRole("button", { name: "Play", exact: true });
  await play.focus();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Baqara · 1–4");
  await expect(play).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  await expect(passageRange(page, "Ayat 5 to 7 of 7")).toHaveCount(1);
  await expect(bar(page).getByRole("button", { name: /previous passage|next passage|Go to ayah/i })).toHaveCount(0);
});

test("a small pager beside the passage heading goes to the previous and the next passage", async ({ page }) => {
  await seedProfile(page, { settings: { surahOrder: "mushaf" } });
  await page.goto("/#/recitation/1/5");
  const previous = page.getByRole("button", { name: "Previous passage", exact: true });
  const next = page.getByRole("button", { name: "Next passage", exact: true });
  await expect(previous).toHaveAttribute("aria-keyshortcuts", "PageUp");
  await expect(next).toHaveAttribute("aria-keyshortcuts", "PageDown");
  await next.click();
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Al-Baqara · 1–4");
  await previous.click();
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
  const box = await next.boundingBox();
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  await expectNoAxeViolations(page);
});

test("Page Down and Page Up work with the focus in the typing field as well", async ({ page }) => {
  await seedProfile(page, { settings: { surahOrder: "mushaf" } });
  await page.goto("/#/recitation/1/5");
  await startTyping(page);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
  await page.keyboard.press("PageDown");
  await expect(page).toHaveURL(/#\/recitation\/2\/1$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
  await page.keyboard.press("PageUp");
  await expect(page).toHaveURL(/#\/recitation\/1\/5$/);
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

test("finishing the last ayah of a surah typed in parts opens the celebration, and Continue goes to the next surah", async ({
  page,
}) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await startTyping(page);
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(card(page)).toBeVisible();
  await expect(card(page).getByRole("term")).toHaveText(["Ayat", "Accuracy", "Speed", "Time"]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await continueButton(page).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
});

test("after the last surah of the order the celebration says the order starts again, and so does its button", async ({
  page,
}) => {
  const naas = surah(114);
  await seedProfile(page, {
    recitation: { position: { surah: 114, ayah: 6 }, surahs: { 114: { typed: [[1, 5]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/114/6");
  await startTyping(page);
  await typeKeys(page, lettersOf(naas, 6, 6));
  await expect(card(page).getByText("This was the last surah in this order. Next, it starts again.")).toBeVisible();
  await expect(continueButton(page)).toHaveCount(0);
  await card(page).getByRole("button", { name: "Start again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
});

test("a passage that ends the order without completing the surah goes on to the start of the order by itself", async ({
  page,
}) => {
  const naas = surah(114);
  await seedProfile(page, { settings: { vocalization: "letters", ayatPerLesson: 1 } });
  await page.goto("/#/recitation/114/6");
  await startTyping(page);
  await typeKeys(page, lettersOf(naas, 6, 6));
  await expect(page).toHaveURL(/#\/recitation\/1\/1$/);
  await expect(card(page)).toHaveCount(0);
});

test("Settings offers ayat per passage and the surah order together, and a change applies at once", async ({
  page,
}) => {
  await page.goto("/#/recitation/1/1");
  await expect(passageRange(page, "Ayat 1 to 4 of 7")).toHaveCount(1);
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  const group = dialog.getByRole("group", { name: "Recitation" });
  const select = group.getByRole("combobox", { name: "Ayat per passage" });
  await expect(select.getByRole("option")).toHaveCount(4);
  await expect(select).toHaveValue("4");
  await select.selectOption("2");
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(passageRange(page, "Ayat 1 to 2 of 7")).toHaveCount(1);
  expect((await savedSettings(page)).ayatPerLesson).toBe(2);
  expect(await doneText(page)).toBe("");
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 10 });
});

test("Continue puts the focus in the typing field once", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await startTyping(page);
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await continueButton(page).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
});

test("moving to another passage from the footer is announced politely with the new range", async ({ page }) => {
  await page.goto("/#/recitation/1/1");
  await expect(surface(page)).toBeVisible();
  const announced = page.getByRole("status").filter({ hasText: "Ayat 5 to 7 of 7" });
  await expect(announced).toHaveCount(0);
  await bar(page).getByRole("button", { name: "Play", exact: true }).focus();
  await page.keyboard.press("PageDown");
  await expect(announced).toHaveCount(1);
  await expect(announced).toContainText("Al-Faatiha");
});

test("retyping only the last passage of a surah completed earlier just moves on: no celebration", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 1 }, surahs: { 108: { typed: [], completions: 1 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await startTyping(page);
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
  await expect(card(page)).toHaveCount(0);
});

test("Type it again after a completed surah starts a fresh count: a partial retype just moves on", async ({ page }) => {
  const kawthar = surah(108);
  await seedProfile(page, {
    recitation: { position: { surah: 108, ayah: 3 }, surahs: { 108: { typed: [[1, 2]], completions: 0 } } },
    settings: { vocalization: "letters", ayatPerLesson: 1 },
  });
  await page.goto("/#/recitation/108/3");
  await startTyping(page);
  await typeKeys(page, lettersOf(kawthar, 3, 3));
  await expect(card(page)).toBeVisible();
  await card(page).getByRole("button", { name: "Type it again" }).click();
  await expect(page).toHaveURL(/#\/recitation\/108\/1$/);
  await typeKeys(page, lettersOf(kawthar, 1, 1, true));
  await expect(page).toHaveURL(/#\/recitation\/108\/2$/);
  await expect(card(page)).toHaveCount(0);
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
  await startTyping(page);
  await typeKeys(page, lettersOf(kawthar, 1, 1, true));
  await expect(card(page)).toBeVisible();
  await continueButton(page).click();
  await expect(page).toHaveURL(/#\/recitation\/109\/1$/);
});

test("another tab finishing the surah does not make a partial passage here open the celebration", async ({
  context,
}) => {
  const kawthar = surah(108);
  const page = await context.newPage();
  await seedProfile(page, { settings: { vocalization: "letters", ayatPerLesson: 1 } });
  await page.goto("/#/recitation/108/1");
  await startTyping(page);
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
  await expect(page).toHaveURL(/#\/recitation\/108\/2$/);
  await expect(card(page)).toHaveCount(0);
});

test("on the home page Tab goes from Settings to the Start link and then through the surahs in order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
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

test("with forced colours the line's track and fill use system colours and differ", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await seedProfile(page, { recitation: { position: null, surahs: { 36: { typed: [[1, 12]], completions: 0 } } } });
  await page.goto("/");
  const track = map(page)
    .getByRole("link", { name: /Yaseen/ })
    .locator("div[aria-hidden=true]");
  const colours = await track.evaluate((element) => [
    getComputedStyle(element).backgroundColor,
    getComputedStyle(element.firstElementChild ?? element).backgroundColor,
  ]);
  expect(colours[0]).not.toBe(colours[1]);
  expect(colours[1]).not.toBe("rgb(226, 176, 98)");
});

test("a surah completed with 95% accuracy has a star, one below that has none, and the tally counts both", async ({
  page,
}) => {
  await seedProfile(page, {
    recitation: {
      position: null,
      surahs: { 112: { typed: [], completions: 1, best: 0.97 }, 108: { typed: [], completions: 2, best: 0.9 } },
    },
  });
  await page.goto("/");
  await expect(page.getByText("2 of 114 surahs complete")).toBeVisible();
  await expect(page.getByText("stars earned")).toHaveCount(1);
  await expect(map(page).getByRole("link", { name: new RegExp(meta(112).tname) })).toContainText("Star earned");
  await expect(map(page).getByRole("link", { name: new RegExp(meta(108).tname) })).not.toContainText("Star earned");
  await expect(map(page).getByRole("link", { name: new RegExp(meta(108).tname) })).toContainText("Completed: 2");
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
  await page.goto("/#/recitation/36", { waitUntil: "commit" });
  await expect(bar(page)).toBeVisible();
  const loading = await bar(page).boundingBox();
  expect(loading?.y ?? 0).toBeGreaterThan(800 * 0.3);
  release();
  await expect(surface(page)).toBeVisible();
});
