import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";

const KEY = "mafatih:profile:2";

test("the saved interface language wins over the browser's language", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, '{"schema":2,"settings":{"language":"ar"}}'), KEY);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("التلاوة");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a first visit shows no storage notice", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("unreadable saved data starts the app fresh and says so", async ({ page }) => {
  await page.addInitScript((key) => localStorage.setItem(key, "{not json"), KEY);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
  await expect(page.getByRole("status")).toHaveText("Your saved progress could not be read, so Mafatih started fresh.");
  await expectNoAxeViolations(page);
});

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG", colorScheme: "dark" });

  test("the notice is shown in the interface language", async ({ page }) => {
    await page.addInitScript((key) => localStorage.setItem(key, '{"schema":7}'), KEY);
    await page.goto("/");
    await expect(page.getByRole("status")).toHaveText("تعذّرت قراءة تقدّمك المحفوظ، فبدأ مفاتيح من جديد.");
    await expectNoAxeViolations(page);
  });
});

test("when the browser blocks storage the app still works and says progress cannot be saved", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await expect(page.getByRole("status")).toHaveText("Your progress can't be saved in this browser.");
  await page.setViewportSize({ width: 320, height: 568 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("data left by the old version is neither used nor touched", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("mafatih.profile", '{"settings":{"language":"ar"}}'));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("mafatih.profile"))).toBe('{"settings":{"language":"ar"}}');
});
