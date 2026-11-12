import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { type Language, openAndWait, PAGES, seedTypicalProfile } from "./helpers/pages.ts";
import { addStyle } from "./helpers/style.ts";

test.use({ timezoneId: "UTC" });

const LANGUAGES: readonly Language[] = ["en", "ar"];
const SCHEMES = ["light", "dark"] as const;
const SETTINGS_NAME = { en: "Settings", ar: "الإعدادات" } as const;
const NARROW = { width: 320, height: 568 } as const;

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

  test.describe(`${language}, 320 pixels at twice the text size`, () => {
    test.use({ viewport: NARROW });

    for (const { name, hash, typing } of PAGES) {
      test(`the ${name} page loses nothing: no sideways scroll, every control inside the screen`, async ({ page }) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, hash, typing);
        await addStyle(page, "html { font-size: 200%; }");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(NARROW.width);
        const outside = await page.evaluate(
          (width) =>
            [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea")]
              .filter((element) => element.offsetParent !== null && !element.closest("[class*='overflow-x-auto']"))
              .map((element) => ({
                name: element.textContent?.trim().slice(0, 30) ?? "",
                box: element.getBoundingClientRect(),
              }))
              .filter(({ box }) => box.width > 1 && (box.right > width + 1 || box.left < -1))
              .map(({ name: label }) => label),
          NARROW.width,
        );
        expect(outside).toEqual([]);
        await expectNoAxeViolations(page);
      });
    }
  });
}
