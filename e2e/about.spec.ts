import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedSettings } from "./helpers/profile.ts";

function credits(page: Page) {
  return page.getByRole("region", { name: "Credits" });
}

test("About says what each mode types, and that the Qur'an is only ever shown whole and in order", async ({ page }) => {
  await page.goto("/#/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["What you type", "Privacy", "Credits"]);
  await expect(page.getByRole("region", { name: "How this site was made" })).toHaveCount(0);
  await expect(page.getByText(/Practice never uses it/)).toBeVisible();
  await expect(page.getByText(/only ever shown whole and in order/)).toBeVisible();
});

test("Privacy says there are no accounts, cookies or analytics, where progress is kept, and the one outside request", async ({
  page,
}) => {
  await page.goto("/#/about");
  const privacy = page.getByRole("region", { name: "Privacy" });
  await expect(privacy).toContainText("no accounts, cookies or analytics");
  await expect(privacy).toContainText("local storage");
  await expect(privacy).toContainText("IndexedDB");
  await expect(privacy).toContainText("The only request to another site is for that audio, from EveryAyah");
  await expect(privacy).toContainText("audio you have played, or that is about to play");
  await expect(privacy).toContainText("sees your address as any site you visit does");
  await expect(privacy).toContainText("sends nothing else about you");
});

test("Credits name every source with its link and licence", async ({ page }) => {
  await page.goto("/#/about");
  const list = credits(page);
  const link = (name: string) => list.getByRole("link", { name });
  await expect(link("Tanzil Project")).toHaveAttribute("href", "https://tanzil.net");
  await expect(link("EveryAyah")).toHaveAttribute("href", "https://everyayah.com");
  await expect(link("Wiktionary via kaikki.org")).toHaveAttribute("href", "https://kaikki.org/dictionary/Arabic/");
  await expect(link("FrequencyWords")).toHaveAttribute("href", "https://github.com/hermitdave/FrequencyWords");
  await expect(link("Fontsource")).toHaveAttribute("href", "https://fontsource.org");
  await expect(link("Microsoft Arabic (101) keyboard")).toHaveAttribute(
    "href",
    "https://learn.microsoft.com/en-us/globalization/keyboards/kbda1",
  );
  await expect(page.locator("main a[href*='scuba-plaza']")).toHaveCount(0);
  await expect(list.getByText("Source code")).toHaveCount(0);
  await expect(list).toContainText("Creative Commons Attribution 3.0");
  await expect(list).toContainText("Creative Commons Attribution-ShareAlike 4.0");
  await expect(list).toContainText("GNU Free Documentation License");
  await expect(list).toContainText("Oct 30, 2026");
  await expect(list).toContainText("Abdul Basit");
  await expect(list).toContainText("SIL Open Font License");
});

test("every link that leaves the site carries noopener and noreferrer", async ({ page }) => {
  await page.goto("/#/about");
  const external = page.locator("main a[href^='http']");
  expect(await external.count()).toBeGreaterThanOrEqual(6);
  for (const link of await external.all()) {
    const rel = (await link.getAttribute("rel")) ?? "";
    expect(rel.split(" ").sort(), (await link.getAttribute("href")) ?? "").toEqual(["noopener", "noreferrer"]);
  }
});

test("About in Arabic is Arabic, and the names of the sources keep their own language", async ({ page }) => {
  await seedSettings(page, { language: "ar" });
  await page.goto("/#/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("حول التطبيق");
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(3);
  const tanzil = page.getByRole("link", { name: "Tanzil Project" });
  await expect(tanzil).toHaveAttribute("lang", "en");
  await expect(page.getByRole("link", { name: "EveryAyah" })).toHaveAttribute("lang", "en");
});

for (const language of ["en", "ar"] as const) {
  for (const colorScheme of ["dark"] as const) {
    test.describe(`${language}, ${colorScheme}`, () => {
      test.use({ colorScheme });

      test("About has no accessibility violations and never scrolls sideways at 320 pixels", async ({ page }) => {
        await seedSettings(page, { language });
        await page.setViewportSize({ width: 320, height: 568 });
        await page.goto("/#/about");
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoAxeViolations(page);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(
          0,
        );
      });
    });
  }
}

test("the Settings dialog ends with a link to About: it closes the dialog and About has the focus", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("link", { name: "About" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/#\/about$/);
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeFocused();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "About" })).toHaveCount(0);
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
});
