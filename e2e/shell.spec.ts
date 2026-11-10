import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";

const PAGES = [
  { hash: "#/", en: "Recitation", ar: "التلاوة" },
  { hash: "#/practice", en: "Practice", ar: "التمرين" },
  { hash: "#/custom", en: "Custom", ar: "نص خاص" },
  { hash: "#/stats", en: "Stats", ar: "الإحصاءات" },
  { hash: "#/about", en: "About", ar: "حول" },
] as const;

for (const language of ["en", "ar"] as const) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${language}, ${colorScheme}`, () => {
      test.use({ locale: language === "ar" ? "ar-EG" : "en-US", colorScheme });

      for (const entry of PAGES) {
        test(`${entry.hash} has one heading, the right language and direction, and no accessibility violations`, async ({
          page,
        }) => {
          await page.goto(`/${entry.hash}`);
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry[language]);
          await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
          await expect(page.locator("html")).toHaveAttribute("lang", language);
          await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
          await expect(page).toHaveTitle(language === "ar" ? `${entry.ar} · مفاتيح` : `${entry.en} · Mafatih`);
          await expectNoAxeViolations(page);
        });
      }
    });
  }
}

test("the page has banner, navigation, main and footer landmarks", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("the skip control is the first stop and moves focus to the content without changing the page", async ({
  page,
}) => {
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("button", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  expect(new URL(page.url()).hash).toBe("#/practice");
});

test("the navigation marks the current page and moving to another page focuses its heading", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await expect(nav.getByRole("link", { name: "Recitation" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Practice" })).not.toHaveAttribute("aria-current");
  await nav.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Practice" })).toBeFocused();
  await expect(nav.getByRole("link", { name: "Practice" })).toHaveAttribute("aria-current", "page");
  await expect(nav.getByRole("link", { name: "Recitation" })).not.toHaveAttribute("aria-current");
  await nav.getByRole("link", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeFocused();
});

test("the first page load does not steal focus", async ({ page }) => {
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1 })).not.toBeFocused();
});

test("the footer links to the About page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("contentinfo").getByRole("link", { name: "About" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();
});

test("an unknown address shows Recitation", async ({ page }) => {
  await page.goto("/#/nowhere");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
});

for (const language of ["en", "ar"] as const) {
  test.describe(`narrow screen, ${language}`, () => {
    test.use({ locale: language === "ar" ? "ar-EG" : "en-US" });

    test("nothing scrolls sideways at 320 pixels", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      for (const entry of PAGES) {
        await page.goto(`/${entry.hash}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry[language]);
        expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(
          0,
        );
      }
    });

    test("every control is at least 44 by 44 pixels on a touch screen", async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch target size applies to touch screens");
      await page.goto("/");
      const controls = page.locator("a:visible, button:visible");
      expect(await controls.count()).toBeGreaterThan(4);
      for (const control of await controls.all()) {
        const box = await control.boundingBox();
        const name = (await control.textContent()) ?? "";
        expect(box?.width, name).toBeGreaterThanOrEqual(44);
        expect(box?.height, name).toBeGreaterThanOrEqual(44);
      }
    });
  });
}
