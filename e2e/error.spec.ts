import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { PROFILE_KEY } from "./helpers/profile.ts";

const HISTORY = [{ at: 1_700_000_000_000, mode: "practice", chars: 40, ms: 20_000, accuracy: 1 }];

async function seedOnceAndBreakDatesWhileSaved(page: Page, language: string): Promise<void> {
  const profile = JSON.stringify({ schema: 2, settings: { language }, history: HISTORY, ladder: { unlocked: 17 } });
  await page.addInitScript(
    `if (sessionStorage.getItem("seeded") === null) {
      sessionStorage.setItem("seeded", "1");
      localStorage.setItem(${JSON.stringify(PROFILE_KEY)}, ${JSON.stringify(profile)});
    }
    if (localStorage.getItem(${JSON.stringify(PROFILE_KEY)}) !== null) {
      Intl.DateTimeFormat = function () { throw new Error("dates are broken"); };
    }`,
  );
}

async function showTheErrorScreen(page: Page): Promise<void> {
  await seedOnceAndBreakDatesWhileSaved(page, "en");
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
}

function saved(page: Page): Promise<boolean> {
  return page.evaluate((key) => localStorage.getItem(key) !== null, PROFILE_KEY);
}

test("a page that throws is replaced by a screen with the problem, Reload and Start over", async ({ page }) => {
  await showTheErrorScreen(page);
  await expect(page.getByText("Mafatih could not show this page.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Reload" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expectNoAxeViolations(page);
});

test("a page that throws leaves its error in the console, so that it can be found", async ({ page }) => {
  const logged: string[] = [];
  page.on("console", async (message) => {
    if (message.type() === "error") {
      const detail = await Promise.all(
        message
          .args()
          .map((argument) => argument.evaluate((value) => (value instanceof Error ? value.message : String(value)))),
      );
      logged.push(`${message.text()} ${detail.join(" ")}`);
    }
  });
  await showTheErrorScreen(page);
  await expect.poll(() => logged.some((text) => text.includes("dates are broken"))).toBe(true);
});

test("Reload loads the page again and keeps the saved progress", async ({ page }) => {
  await showTheErrorScreen(page);
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Reload" }).click();
  await reloaded;
  await expect(page.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible();
  expect(await saved(page)).toBe(true);
});

test("Start over asks first, and Keep my progress leaves the saved progress alone", async ({ page }) => {
  await showTheErrorScreen(page);
  await page.getByRole("button", { name: "Start over" }).click();
  const question = page.getByRole("group", { name: "Erase your progress and settings?" });
  await expect(question).toBeVisible();
  await expect(question).toContainText("This deletes your progress and settings from this browser and starts again.");
  await expect(question.getByRole("button", { name: "Keep my progress" })).toBeFocused();
  await question.getByRole("button", { name: "Keep my progress" }).click();
  await expect(question).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
  expect(await saved(page)).toBe(true);
});

test("Erase clears the saved profile and the page then works again", async ({ page }) => {
  await showTheErrorScreen(page);
  await page.getByRole("button", { name: "Start over" }).click();
  const reloaded = page.waitForEvent("load");
  await page
    .getByRole("group", { name: "Erase your progress and settings?" })
    .getByRole("button", { name: "Erase" })
    .click();
  await reloaded;
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  await expect(page.getByText("No lessons yet.")).toBeVisible();
  expect(await saved(page)).toBe(false);
});

test("the error screen is in the saved language", async ({ page }) => {
  await seedOnceAndBreakDatesWhileSaved(page, "ar");
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1, name: "حدث خطأ ما" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ابدأ من جديد" })).toBeVisible();
  await expectNoAxeViolations(page);
});
