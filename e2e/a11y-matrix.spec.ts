import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { type Language, openAndWait, PAGES, seedTypicalProfile } from "./helpers/pages.ts";
import { addStyle, WIDE_LARGE_TEXT } from "./helpers/style.ts";

test.use({ timezoneId: "UTC", locale: "en-US" });

const LANGUAGES: readonly Language[] = ["en", "ar"];
const SCHEMES = ["dark"] as const;
const SETTINGS_NAME = { en: "Settings", ar: "الإعدادات" } as const;
const NARROW = { width: 320, height: 568 } as const;

async function settled(page: Page): Promise<void> {
  await page.evaluate(
    () => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))),
  );
}

async function expectNothingLost(page: Page): Promise<void> {
  await settled(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(NARROW.width);
  const outside = await page.evaluate((width) => {
    const scrolls = (element: Element): boolean => {
      for (let node = element.parentElement; node !== null; node = node.parentElement) {
        const { overflowX } = getComputedStyle(node);
        if ((overflowX === "auto" || overflowX === "scroll") && node.scrollWidth > node.clientWidth) {
          return true;
        }
      }
      return false;
    };
    return [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea")]
      .filter((element) => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== "hidden")
      .filter((element) => !scrolls(element))
      .map((element) => ({
        name: element.textContent?.trim().slice(0, 30) ?? "",
        box: element.getBoundingClientRect(),
      }))
      .filter(({ box }) => box.width > 1 && (box.right > width + 1 || box.left < -1))
      .map(({ name }) => name);
  }, NARROW.width);
  expect(outside).toEqual([]);
  await expectNoAxeViolations(page);
}

for (const language of LANGUAGES) {
  for (const colorScheme of SCHEMES) {
    test.describe(`${language}, ${colorScheme}`, () => {
      test.use({ colorScheme });

      for (const { name, hash, typing } of PAGES) {
        test(`the ${name} page has no accessibility violations`, async ({ page }) => {
          await seedTypicalProfile(page, language);
          await openAndWait(page, hash, typing);
          await expectNoAxeViolations(page);
        });
      }

      test("the Settings dialog has no accessibility violations", async ({ page }) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, "#/practice", true);
        await page.getByRole("button", { name: SETTINGS_NAME[language] }).click();
        await expect(page.getByRole("dialog", { name: SETTINGS_NAME[language] })).toBeVisible();
        await expectNoAxeViolations(page);
      });
    });
  }

  test.describe(`${language}, headings`, () => {
    for (const { name, hash, typing } of PAGES) {
      test(`the ${name} page has one named h1 and an outline that never skips a level`, async ({ page }) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, hash, typing);
        const headings = await page.evaluate(() =>
          [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")]
            .filter((element) => element.getClientRects().length > 0)
            .map((element) => ({ level: Number(element.tagName.slice(1)), text: element.textContent?.trim() ?? "" })),
        );
        expect(headings.filter(({ level }) => level === 1)).toHaveLength(1);
        expect(headings[0]?.level).toBe(1);
        expect(headings.filter(({ text }) => text === "").length).toBe(0);
        const skips = headings.filter(({ level }, index) => index > 0 && level - (headings[index - 1]?.level ?? 0) > 1);
        expect(skips).toEqual([]);
      });
    }
  });

  test.describe(`${language}, 320 pixels at twice the text size`, () => {
    test.use({ viewport: NARROW });

    for (const { name, hash, typing } of PAGES) {
      test(`the ${name} page loses nothing: no sideways scroll, every control inside the screen`, async ({ page }) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, hash, typing);
        await addStyle(page, WIDE_LARGE_TEXT);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNothingLost(page);
      });
    }

    test("the Settings dialog loses nothing either", async ({ page }) => {
      await seedTypicalProfile(page, language);
      await openAndWait(page, "#/custom", true);
      await addStyle(page, WIDE_LARGE_TEXT);
      await page.getByRole("button", { name: SETTINGS_NAME[language] }).click();
      await expect(page.getByRole("dialog", { name: SETTINGS_NAME[language] })).toBeVisible();
      await expectNothingLost(page);
    });
  });
}
