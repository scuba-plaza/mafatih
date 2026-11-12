import { expect, type Locator, type Page, test } from "@playwright/test";
import { type Language, openAndWait, PAGES, type PageName, seedTypicalProfile } from "./helpers/pages.ts";

test.use({ timezoneId: "UTC" });

const SETTINGS_NAME = { en: "Settings", ar: "الإعدادات" } as const;

function regionOf(page: Page, name: PageName): Locator {
  return name === "practice" ? page.locator("main section").first() : page.getByRole("main");
}

for (const language of ["en", "ar"] as const satisfies readonly Language[]) {
  test.describe(language, () => {
    for (const { name, hash, typing } of PAGES) {
      test(`the ${name} page keeps its accessibility tree`, async ({ page }, testInfo) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, hash, typing);
        const project = testInfo.project.name;
        await expect(regionOf(page, name)).toMatchAriaSnapshot({ name: `${project}-${language}-${name}.aria.yml` });
        await expect(page.getByRole("banner")).toMatchAriaSnapshot({
          name: `${project}-${language}-${name}-header.aria.yml`,
        });
      });
    }

    test("the Settings dialog keeps its accessibility tree", async ({ page }, testInfo) => {
      await seedTypicalProfile(page, language);
      await openAndWait(page, "#/custom", true);
      await page.getByRole("button", { name: SETTINGS_NAME[language] }).click();
      const dialog = page.getByRole("dialog", { name: SETTINGS_NAME[language] });
      await expect(dialog).toBeVisible();
      await expect(dialog).toMatchAriaSnapshot({ name: `${testInfo.project.name}-${language}-settings.aria.yml` });
    });
  });
}
