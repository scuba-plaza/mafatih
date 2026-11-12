import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedProfile } from "./helpers/profile.ts";
import { addStyle } from "./helpers/style.ts";

test.use({ timezoneId: "UTC" });

const FATHA = String.fromCodePoint(0x64e);
const DOTTED_CIRCLE = String.fromCodePoint(0x25cc);

function stat(attempts: number, hits: number, timed: number, meanMs: number) {
  return { attempts, hits, timed, meanMs, recentAccuracy: hits / attempts };
}

const PRACTICE_STATS = {
  ب: stat(10, 9, 8, 420),
  ا: stat(7, 7, 7, 380),
  [FATHA]: stat(4, 3, 2, 640),
  " ": stat(5, 5, 5, 300),
  لا: stat(2, 2, 0, 0),
};

const MODES = ["practice", "recitation", "custom"] as const;

function lessons(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    at: Date.UTC(2026, 10, index + 1, 12, 0),
    mode: MODES[index % 3],
    chars: 60,
    ms: index === count - 1 ? 0 : 30_000,
    accuracy: 0.95,
  }));
}

const PROFILE = {
  stats: { practice: PRACTICE_STATS, recitation: { ك: stat(3, 3, 3, 500) }, custom: {} },
  history: lessons(12),
};

function keys(page: Page) {
  return page.getByRole("table", { name: /^Keys in/ });
}

function keysHeading(page: Page, mode: string) {
  return page.getByRole("heading", { level: 2, name: new RegExp(`^Keys in \\P{L}*${mode}`, "u") });
}

function recent(page: Page) {
  return page.getByRole("table", { name: "Last ten lessons" });
}

function modes(page: Page) {
  return page.getByRole("group", { name: "Show statistics for" });
}

async function openPractice(page: Page): Promise<void> {
  await page.goto("/#/stats");
  await modes(page).getByRole("radio", { name: "Practice" }).check();
}

async function texts(row: ReturnType<Page["getByRole"]>): Promise<string[]> {
  return row.getByRole("cell").allTextContents();
}

test("a fresh profile says what to do instead of showing empty tables", async ({ page }) => {
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stats");
  await expect(modes(page).getByRole("radio")).toHaveCount(3);
  await expect(modes(page).getByRole("radio", { name: "Practice" })).toBeChecked();
  await expect(
    page.getByText(/^No keys yet\. Type in \P{L}*Practice\P{L}* and they will appear here\.$/u),
  ).toBeVisible();
  await expect(keys(page)).toHaveCount(0);
  await expect(page.getByText("No lessons yet.")).toBeVisible();
  await expect(recent(page)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

test("the key table lists keys in ladder order with their speed, accuracy and attempts", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const table = keys(page);
  await expect(keysHeading(page, "Practice")).toBeVisible();
  await expect(table.getByRole("columnheader")).toHaveText([
    "Key",
    "Time per key (ms)",
    "Right first time",
    "Attempts",
  ]);
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(6);
  const heads = await table.getByRole("rowheader").allTextContents();
  expect(heads).toEqual(["ا", "ب", `${DOTTED_CIRCLE}${FATHA} fatha`, "Space", "لا"]);
  expect(await texts(rows.nth(1))).toEqual(["380", "100%", "7"]);
  expect(await texts(rows.nth(2))).toEqual(["420", "90%", "10"]);
  expect(await texts(rows.nth(3))).toEqual(["640", "75%", "4"]);
  expect(await texts(rows.nth(4))).toEqual(["300", "100%", "5"]);
  expect(await texts(rows.nth(5))).toEqual(["Not yet", "100%", "2"]);
});

test("a mark is drawn on a dotted circle and named, so that it shows and is read alone", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const mark = keys(page).getByRole("rowheader", { name: /fatha$/ });
  await expect(mark).toHaveCount(1);
  await expect(mark.locator("[lang=ar]")).toHaveText(`${DOTTED_CIRCLE}${FATHA}`);
  await expect(mark).toHaveAccessibleName(`${DOTTED_CIRCLE}${FATHA} fatha`);
});

test("only Arabic keys are tagged Arabic: the word Space is the page's own language", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const letter = keys(page).getByRole("rowheader", { name: "ب" });
  await expect(letter.locator("[lang=ar]")).toHaveText("ب");
  const space = keys(page).getByRole("rowheader", { name: "Space" });
  await expect(space).toHaveCount(1);
  await expect(space.locator("[lang]")).toHaveCount(0);
  await expect(space.evaluate((element) => element.closest("[lang=ar]"))).resolves.toBeNull();
});

test("each table has a heading of its own and is named by it", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(2);
  await expect(keysHeading(page, "Practice")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Last ten lessons" })).toBeVisible();
  await expect(keys(page)).toBeVisible();
  await expect(recent(page)).toBeVisible();
  await expect(page.locator("caption")).toHaveCount(0);
});

test("the radio group chooses the mode of the key table, and each mode has its own empty state", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  await modes(page).getByRole("radio", { name: "Recitation" }).check();
  await expect(keysHeading(page, "Recitation")).toBeVisible();
  await expect(keys(page).getByRole("rowheader")).toHaveText(["ك"]);
  await modes(page).getByRole("radio", { name: "Custom" }).check();
  await expect(keys(page)).toHaveCount(0);
  await expect(page.getByText(/^No keys yet\. Type in \P{L}*Custom\P{L}* and they will appear here\.$/u)).toBeVisible();
  await modes(page).getByRole("radio", { name: "Practice" }).check();
  await expect(keys(page).getByRole("rowheader")).toHaveCount(5);
});

test("changing the mode is announced politely with how many keys it holds", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const status = page.getByRole("status").filter({ hasText: /Keys:/ });
  await expect(status).toHaveText(/^\P{L}*Practice\P{L}*\. Keys: 5\.$/u);
  await modes(page).getByRole("radio", { name: "Recitation" }).check();
  await expect(status).toHaveText(/^\P{L}*Recitation\P{L}*\. Keys: 1\.$/u);
  await modes(page).getByRole("radio", { name: "Custom" }).check();
  await expect(status).toHaveText(/^\P{L}*Custom\P{L}*\. Keys: 0\.$/u);
  await expect(status).toHaveClass(/sr-only/);
});

test("the mode of the last lesson is the one shown first", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await page.goto("/#/stats");
  await expect(modes(page).getByRole("radio", { name: "Custom" })).toBeChecked();
  await seedProfile(page, { ...PROFILE, history: lessons(11) });
  await page.reload();
  await expect(modes(page).getByRole("radio", { name: "Recitation" })).toBeChecked();
  await seedProfile(page, { ...PROFILE, history: lessons(10) });
  await page.reload();
  await expect(modes(page).getByRole("radio", { name: "Practice" })).toBeChecked();
});

test("the last ten lessons are listed newest first with date, mode, speed and accuracy", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await page.goto("/#/stats");
  const table = recent(page);
  await expect(table.getByRole("columnheader")).toHaveText([
    "Date",
    "Mode",
    "Speed (characters per minute)",
    "Accuracy",
  ]);
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(11);
  expect(await texts(rows.nth(1))).toEqual(["Nov 12, 2026", "Custom", "Not yet", "95%"]);
  expect(await texts(rows.nth(2))).toEqual(["Nov 11, 2026", "Recitation", "120", "95%"]);
  expect(await texts(rows.nth(3))).toEqual(["Nov 10, 2026", "Practice", "120", "95%"]);
  expect(await texts(rows.nth(10))).toEqual(["Nov 3, 2026", "Custom", "120", "95%"]);
});

test("the bars are for the eye only: the numbers carry the information", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const bars = keys(page).locator("[aria-hidden=true]");
  await expect(bars).toHaveCount(5);
  await expect(keys(page).getByRole("cell", { name: /^\d+%$/ })).toHaveCount(5);
});

test("with forced colours the bars are drawn in system colours and differ", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const colours = await keys(page)
    .locator("[aria-hidden=true]")
    .first()
    .evaluate((track) => [track, track.firstElementChild].map((bar) => bar && getComputedStyle(bar).backgroundColor));
  expect(colours).toHaveLength(2);
  expect(colours[0]).not.toBe("rgba(0, 0, 0, 0)");
  expect(colours[1]).not.toBe("rgba(0, 0, 0, 0)");
  expect(colours[0]).not.toBe(colours[1]);
});

test("in the Arabic interface the labels and the digits are Arabic", async ({ page }) => {
  await seedProfile(page, { ...PROFILE, settings: { language: "ar" } });
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("الإحصاءات");
  await page.getByRole("group", { name: "اعرض إحصاءات" }).getByRole("radio", { name: "التمرين" }).check();
  const table = page.getByRole("table", { name: /^المفاتيح في/ });
  await expect(table.getByRole("columnheader")).toHaveText([
    "المفتاح",
    "الزمن لكل مفتاح (بالملي ثانية)",
    "صحيح من أول مرة",
    "المحاولات",
  ]);
  const cells = await texts(table.getByRole("row").nth(2));
  expect(cells[0]).toBe("\u0664\u0662\u0660");
  expect(cells[1]).toMatch(/^\u0669\u0660\u066A/);
  expect(cells[2]).toBe("\u0661\u0660");
  await expect(page.getByRole("table", { name: "آخر عشرة دروس" })).toBeVisible();
});

for (const language of ["en", "ar"] as const) {
  for (const colorScheme of ["dark"] as const) {
    test.describe(`${language}, ${colorScheme}`, () => {
      test.use({ colorScheme });

      test("the page has no accessibility violations, with data and without", async ({ page }) => {
        await seedProfile(page, { ...PROFILE, settings: { language } });
        await page.goto("/#/stats");
        await expect(page.getByRole("table").first()).toBeVisible();
        await expectNoAxeViolations(page);
        await seedProfile(page, { settings: { language } });
        await page.reload();
        await expect(page.getByRole("table")).toHaveCount(0);
        await expectNoAxeViolations(page);
      });
    });
  }
}

test("at 320 pixels the page never scrolls sideways: a table too wide for it scrolls inside a region the keyboard can reach", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await seedProfile(page, PROFILE);
  await page.goto("/#/stats");
  const scroller = page.getByRole("group", { name: /^Scrollable: \P{L}*Last ten lessons/u });
  await expect(recent(page)).toBeVisible();
  await expect(scroller).toHaveAttribute("tabindex", "0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
  await addStyle(page, "html { font-size: 150%; }");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await addStyle(page, "html { font-size: 100%; }");
  await expect(scroller).toHaveCount(0);
});

test("Reset progress empties the statistics and the lesson list", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  await expect(keys(page)).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("button", { name: "Reset progress" }).click();
  await dialog.getByRole("group", { name: "Reset progress?" }).getByRole("button", { name: "Reset" }).click();
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(keys(page)).toHaveCount(0);
  await expect(page.getByText("No lessons yet.")).toBeVisible();
});
