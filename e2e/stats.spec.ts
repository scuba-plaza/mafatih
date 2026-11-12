import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedProfile } from "./helpers/profile.ts";

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
    page.getByText("No Practice keys yet. Type a Practice lesson and its keys will appear here."),
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
  await expect(table.locator("caption")).toContainText("Practice");
  await expect(table.getByRole("columnheader")).toHaveText(["Key", "Speed (ms)", "Accuracy", "Attempts"]);
  const rows = table.getByRole("row");
  await expect(rows).toHaveCount(6);
  const heads = await table.getByRole("rowheader").allTextContents();
  expect(heads).toEqual(["ا", "ب", `${DOTTED_CIRCLE}${FATHA}`, "Space", "لا"]);
  expect(await texts(rows.nth(1))).toEqual(["380", "100%", "7"]);
  expect(await texts(rows.nth(2))).toEqual(["420", "90%", "10"]);
  expect(await texts(rows.nth(3))).toEqual(["640", "75%", "4"]);
  expect(await texts(rows.nth(4))).toEqual(["300", "100%", "5"]);
  expect(await texts(rows.nth(5))).toEqual(["Not yet", "100%", "2"]);
});

test("a mark is drawn on a dotted circle so that it shows alone, and the key cells are Arabic text", async ({
  page,
}) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  const mark = keys(page).getByRole("rowheader").filter({ hasText: DOTTED_CIRCLE });
  await expect(mark).toHaveCount(1);
  await expect(mark).toHaveAttribute("lang", "ar");
  await expect(keys(page).getByRole("rowheader", { name: "ب" })).toHaveAttribute("lang", "ar");
});

test("the radio group chooses the mode of the key table, and each mode has its own empty state", async ({ page }) => {
  await seedProfile(page, PROFILE);
  await openPractice(page);
  await modes(page).getByRole("radio", { name: "Recitation" }).check();
  await expect(keys(page).locator("caption")).toContainText("Recitation");
  await expect(keys(page).getByRole("rowheader")).toHaveText(["ك"]);
  await modes(page).getByRole("radio", { name: "Custom" }).check();
  await expect(keys(page)).toHaveCount(0);
  await expect(
    page.getByText("No Custom keys yet. Type a text in Custom and its keys will appear here."),
  ).toBeVisible();
  await modes(page).getByRole("radio", { name: "Practice" }).check();
  await expect(keys(page).getByRole("rowheader")).toHaveCount(5);
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
  for (const row of (await keys(page).getByRole("row").all()).slice(1)) {
    expect((await row.getByRole("cell").nth(1).textContent())?.trim()).toMatch(/\d+%/);
  }
});

test("in the Arabic interface the labels and the digits are Arabic", async ({ page }) => {
  await seedProfile(page, { ...PROFILE, settings: { language: "ar" } });
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("الإحصاءات");
  await page.getByRole("group", { name: "عرض إحصاءات" }).getByRole("radio", { name: "التمرين" }).check();
  const table = page.getByRole("table", { name: /^المفاتيح في/ });
  await expect(table.getByRole("columnheader")).toHaveText(["المفتاح", "السرعة (بالملّي ثانية)", "الدقة", "المحاولات"]);
  const cells = await texts(table.getByRole("row").nth(2));
  expect(cells[0]).toBe("\u0664\u0662\u0660");
  expect(cells[1]).toMatch(/^\u0669\u0660\u066A/);
  expect(cells[2]).toBe("\u0661\u0660");
  await expect(page.getByRole("table", { name: "آخر عشرة دروس" })).toBeVisible();
});

for (const language of ["en", "ar"] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
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
  const scroller = page.getByRole("region", { name: "Last ten lessons" });
  await expect(recent(page)).toBeVisible();
  await expect(scroller).toHaveAttribute("tabindex", "0");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
  await page.addStyleTag({ content: "html { font-size: 150%; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.addStyleTag({ content: "html { font-size: 100%; }" });
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
