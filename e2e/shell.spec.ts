import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";

const PAGES = [
  { hash: "#/", en: "Recitation", ar: "التلاوة" },
  { hash: "#/practice", en: "Practice", ar: "التمرين" },
  { hash: "#/custom", en: "Custom", ar: "نص مخصص" },
  { hash: "#/stats", en: "Stats", ar: "الإحصاءات" },
  { hash: "#/about", en: "About", ar: "حول التطبيق" },
] as const;

const LOCALES = { en: "en-US", ar: "ar-EG" } as const;

const COPY = {
  en: { app: "Mafatih", nav: "Main", skip: "Skip to content", start: "Start typing", settings: "Settings" },
  ar: { app: "مفاتيح", nav: "التنقل الرئيسي", skip: "انتقل إلى المحتوى", start: "ابدأ الكتابة", settings: "الإعدادات" },
} as const;

async function sidewaysOverflow(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}

async function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => document.activeElement?.textContent ?? "");
}

for (const language of ["en", "ar"] as const) {
  const copy = COPY[language];

  for (const colorScheme of ["dark"] as const) {
    test.describe(`${language}, ${colorScheme}`, () => {
      test.use({ locale: LOCALES[language], colorScheme });

      for (const entry of PAGES) {
        test(`${entry.hash} has one heading, the right language and direction, and no accessibility violations`, async ({
          page,
        }) => {
          await page.goto(`/${entry.hash}`);
          await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry[language]);
          await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
          await expect(page.locator("html")).toHaveAttribute("lang", language);
          await expect(page.locator("html")).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
          await expect(page).toHaveTitle(`${entry[language]} · ${copy.app}`);
          await expectNoAxeViolations(page);
        });
      }
    });
  }

  test.describe(`${language}`, () => {
    test.use({ locale: LOCALES[language] });

    test("the page has banner, navigation, main and footer landmarks", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("navigation", { name: copy.nav })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeVisible();
    });

    test("the navigation is a list of the four pages, each named in words", async ({ page }) => {
      await page.goto("/");
      const nav = page.getByRole("navigation", { name: copy.nav });
      await expect(nav.getByRole("listitem")).toHaveCount(4);
      for (const entry of PAGES.slice(0, 4)) {
        await expect(nav.getByRole("link", { name: entry[language], exact: true })).toBeVisible();
      }
    });

    test("the skip control is the first stop, is fully visible and moves focus to the content", async ({ page }) => {
      await page.goto("/#/practice");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[1][language]);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("button", { name: copy.skip });
      await expect(skip).toBeFocused();
      await expect(skip).toBeInViewport({ ratio: 1 });
      expect(
        await skip.evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingInlineStart)),
      ).toBeGreaterThanOrEqual(16);
      const practice = page.getByRole("link", { name: PAGES[1][language], exact: true });
      const skipBox = await skip.boundingBox();
      const linkBox = await practice.boundingBox();
      expect((skipBox?.y ?? 0) + (skipBox?.height ?? 0)).toBeLessThanOrEqual(linkBox?.y ?? 0);
      await page.keyboard.press("Enter");
      await expect(page.getByRole("main")).toBeFocused();
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[1][language]);
      expect(new URL(page.url()).hash).toBe("#/practice");
    });

    test("the tab order follows the reading order and every stop shows a focus outline", async ({ page }) => {
      await page.goto("/#/practice");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[1][language]);
      const names = PAGES.map((entry) => entry[language]);
      const expected = [copy.skip, ...names.slice(0, 4), copy.settings, copy.start, ...names.slice(4)];
      const edges: number[] = [];
      for (const name of expected) {
        await page.keyboard.press("Tab");
        expect(await focusedName(page)).toBe(name);
        const outline = await page.evaluate(
          () => getComputedStyle(document.activeElement ?? document.body).outlineStyle,
        );
        expect(outline, name).toBe("solid");
        const box = await page.evaluate(() => document.activeElement?.getBoundingClientRect().toJSON());
        edges.push(language === "ar" ? -(box?.right ?? 0) : (box?.left ?? 0));
      }
      const navEdges = edges.slice(1, 5);
      expect(navEdges).toEqual([...navEdges].sort((a, b) => a - b));
    });

    test("nothing scrolls sideways at 320 pixels", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      for (const entry of PAGES) {
        await page.goto(`/${entry.hash}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry[language]);
        expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      }
    });

    test("at 320 pixels the navigation stays on one line", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/");
      const tops = new Set<number>();
      for (const link of await page.getByRole("navigation", { name: copy.nav }).getByRole("link").all()) {
        const box = await link.boundingBox();
        tops.add(box?.y ?? -1);
        expect(box?.height).toBe(44);
      }
      expect(tops.size).toBe(1);
    });

    test("at 320 pixels with text at 200 percent every page stays reachable without sideways scrolling", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/#/practice");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[1][language]);
      await page.evaluate(() => {
        document.documentElement.style.fontSize = "200%";
      });
      expect(await sidewaysOverflow(page)).toBeLessThanOrEqual(0);
      for (const link of await page.getByRole("link").all()) {
        const box = await link.boundingBox();
        const name = (await link.getAttribute("href")) ?? "";
        expect(box?.x, name).toBeGreaterThanOrEqual(0);
        expect((box?.x ?? 0) + (box?.width ?? 0), name).toBeLessThanOrEqual(320);
      }
      const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
      expect(heading?.x).toBeGreaterThanOrEqual(0);
      expect((heading?.x ?? 0) + (heading?.width ?? 0)).toBeLessThanOrEqual(320);
    });

    test("every control is at least 44 by 44 pixels on a touch screen, on every page", async ({ page, isMobile }) => {
      test.skip(!isMobile, "touch target size applies to touch screens");
      for (const entry of PAGES) {
        await page.goto(`/${entry.hash}`);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText(entry[language]);
        const skip = page.getByRole("button", { name: copy.skip });
        await skip.focus();
        const controls = page.locator("a:visible, button:visible");
        expect(await controls.count()).toBeGreaterThanOrEqual(6);
        for (const control of await controls.all()) {
          const box = await control.boundingBox();
          const name = `${entry.hash} ${(await control.getAttribute("href")) ?? "skip"}`;
          expect(box?.width, name).toBeGreaterThanOrEqual(44);
          expect(box?.height, name).toBeGreaterThanOrEqual(44);
        }
      }
    });

    test("a display cutout on one side pads that same side whatever the reading direction", async ({ page }) => {
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { right: 40 } });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[0][language]);
      for (const landmark of ["banner", "main", "contentinfo"] as const) {
        const padding = await page.getByRole(landmark).evaluate((element) => {
          const style = getComputedStyle(element);
          return [style.paddingLeft, style.paddingRight];
        });
        expect(padding, landmark).toEqual(["16px", "40px"]);
      }
    });
  });
}

test("the navigation marks the current page without changing the width of its labels", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  const recitation = nav.getByRole("link", { name: "Recitation" });
  const practice = nav.getByRole("link", { name: "Practice" });
  await expect(recitation).toHaveAttribute("aria-current", "page");
  await expect(practice).not.toHaveAttribute("aria-current");
  const before = await practice.boundingBox();
  await practice.click();
  await expect(practice).toHaveAttribute("aria-current", "page");
  await expect(recitation).not.toHaveAttribute("aria-current");
  expect(await practice.boundingBox()).toEqual(before);
  expect(await practice.evaluate((element) => getComputedStyle(element).borderBottomColor)).not.toBe(
    await recitation.evaluate((element) => getComputedStyle(element).borderBottomColor),
  );
});

test("moving to another page focuses its heading and renames the document", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("link", { name: "Practice" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Practice" })).toBeFocused();
  await expect(page).toHaveTitle("Practice · Mafatih");
  await nav.getByRole("link", { name: "Stats" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeFocused();
  await expect(page).toHaveTitle("Stats · Mafatih");
});

test("Back and Forward move between pages, focus the heading and rename the document", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Practice" }).click();
  await page.getByRole("link", { name: "Custom" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Custom" })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { level: 1, name: "Practice" })).toBeFocused();
  await expect(page).toHaveTitle("Practice · Mafatih");
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1, name: "Custom" })).toBeFocused();
  await expect(page).toHaveTitle("Custom · Mafatih");
});

test("following the link of the page you are on changes nothing and keeps focus on the link", async ({ page }) => {
  await page.goto("/#/practice");
  const practice = page.getByRole("link", { name: "Practice" });
  await practice.focus();
  await page.keyboard.press("Enter");
  await expect(practice).toBeFocused();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
});

test("the first page load leaves focus on the document", async ({ page }) => {
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stats");
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
});

test("the footer links to the About page and marks it as current there", async ({ page }) => {
  await page.goto("/");
  const about = page.getByRole("contentinfo").getByRole("link", { name: "About" });
  const thickness = (): Promise<string> =>
    about.evaluate((element) => getComputedStyle(element).textDecorationThickness);
  const before = await thickness();
  await about.click();
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeFocused();
  await expect(about).toHaveAttribute("aria-current", "page");
  expect(await thickness()).not.toBe(before);
});

test("an unknown or misspelled address shows Recitation and is rewritten to the real address", async ({ page }) => {
  await page.goto("/#/nowhere");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
  await expect(page).toHaveTitle("Recitation · Mafatih");
  await expect(page).toHaveURL(/#\/$/);
  await page.goto("/#//practice/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await expect(page).toHaveURL(/#\/practice$/);
});

test("an address without a hash is left as it is", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Recitation");
  expect(new URL(page.url()).hash).toBe("");
});
