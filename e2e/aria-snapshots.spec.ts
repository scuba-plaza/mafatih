import { expect, type Locator, type Page, test } from "@playwright/test";
import { type Language, openAndWait, PAGES, type PageName, seedTypicalProfile } from "./helpers/pages.ts";

test.use({ timezoneId: "UTC", locale: "en-US" });

const SETTINGS_NAME = { en: "Settings", ar: "الإعدادات" } as const;
const SURAH_COUNT = 114;

function regionsOf(page: Page, name: PageName): Record<string, Locator> {
  const main = page.getByRole("main");
  if (name === "map") {
    const items = main.getByRole("listitem");
    return {
      heading: main.getByRole("heading", { level: 1 }),
      start: main.getByRole("link").first(),
      first: items.first(),
      last: items.last(),
    };
  }
  if (name === "practice") {
    return { readout: page.locator("main section").first() };
  }
  return { page: main };
}

function viewportOf(isMobile: boolean | undefined): string {
  return isMobile === true ? "mobile" : "desktop";
}

for (const language of ["en", "ar"] as const satisfies readonly Language[]) {
  test.describe(language, () => {
    for (const { name, hash, typing, current } of PAGES) {
      test(`the ${name} page keeps its accessibility tree`, async ({ page }, testInfo) => {
        await seedTypicalProfile(page, language);
        await openAndWait(page, hash, typing);
        const viewport = viewportOf(testInfo.project.use.isMobile);
        for (const [key, region] of Object.entries(regionsOf(page, name))) {
          await expect(region).toMatchAriaSnapshot({ name: `${viewport}-${language}-${name}-${key}.aria.yml` });
        }
        await expect(page.getByRole("banner")).toMatchAriaSnapshot({
          name: `${viewport}-${language}-${name}-header.aria.yml`,
        });
        if (name === "map") {
          await expect(page.getByRole("main").getByRole("listitem")).toHaveCount(SURAH_COUNT);
        }
        const marked = page.locator('[aria-current="page"]:visible');
        if (name === "about") {
          await expect(marked).toHaveCount(0);
        } else {
          await expect(marked).toHaveCount(1);
          await expect(marked).toHaveText(current[language]);
        }
      });
    }

    test("the Settings dialog keeps its accessibility tree", async ({ page }, testInfo) => {
      await seedTypicalProfile(page, language);
      await openAndWait(page, "#/custom", true);
      await page.getByRole("button", { name: SETTINGS_NAME[language] }).click();
      const dialog = page.getByRole("dialog", { name: SETTINGS_NAME[language] });
      await expect(dialog).toBeVisible();
      const viewport = viewportOf(testInfo.project.use.isMobile);
      await expect(dialog).toMatchAriaSnapshot({ name: `${viewport}-${language}-settings.aria.yml` });
    });
  });
}
