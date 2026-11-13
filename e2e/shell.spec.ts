import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { seedSettings } from "./helpers/profile.ts";

const PAGES = [
  { hash: "#/", en: "Recitation", ar: "التلاوة" },
  { hash: "#/practice", en: "Practice", ar: "التمرين" },
  { hash: "#/custom", en: "Custom", ar: "نص مخصص" },
  { hash: "#/stats", en: "Stats", ar: "الإحصاءات" },
  { hash: "#/about", en: "About", ar: "حول التطبيق" },
] as const;

const LOCALES = { en: "en-US", ar: "ar-EG" } as const;

const COPY = {
  en: { app: "Mafatih", nav: "Main", skip: "Skip to content", input: "Type the text shown", settings: "Settings" },
  ar: {
    app: "مفاتيح",
    nav: "التنقل الرئيسي",
    skip: "انتقل إلى المحتوى",
    input: "اكتب النص الظاهر",
    settings: "الإعدادات",
  },
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

    test("the page has banner, navigation and main landmarks, and no footer", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("banner")).toBeVisible();
      await expect(page.getByRole("navigation", { name: copy.nav })).toBeVisible();
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toHaveCount(0);
    });

    test("on a wide screen the banner holds the Arabic wordmark, the four pages and Settings, and there is no tab bar", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/");
      const banner = page.getByRole("banner");
      const mark = banner.getByRole("img", { name: copy.app });
      await expect(mark).toHaveText("مفاتيح");
      await expect(mark).toHaveAttribute("lang", "ar");
      const nav = banner.getByRole("navigation", { name: copy.nav });
      await expect(nav.getByRole("link")).toHaveCount(4);
      await expect(banner.getByRole("button", { name: copy.settings })).toBeVisible();
      await expect(page.getByRole("navigation")).toHaveCount(1);
    });

    test("on a phone the banner holds the wordmark and a settings icon, and the four pages are a bar at the bottom", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      const banner = page.getByRole("banner");
      await expect(banner.getByRole("img", { name: copy.app })).toBeVisible();
      await expect(banner.getByRole("navigation")).toHaveCount(0);
      const settings = banner.getByRole("button", { name: copy.settings });
      const box = await settings.boundingBox();
      expect(box?.width).toBeGreaterThanOrEqual(44);
      expect(box?.height).toBeGreaterThanOrEqual(44);
      const nav = page.getByRole("navigation", { name: copy.nav });
      await expect(nav.getByRole("link")).toHaveCount(4);
      const bar = await nav.boundingBox();
      expect((bar?.y ?? 0) + (bar?.height ?? 0)).toBeCloseTo(844, 0);
      expect(bar?.width).toBe(390);
    });

    test("the bar at the bottom of a phone stays while the typing field has focus, and goes away only while a soft keyboard is up", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.addInitScript(() => {
        const viewport = Object.assign(new EventTarget(), { height: window.innerHeight, width: window.innerWidth });
        Object.defineProperty(window, "visualViewport", { value: viewport, configurable: true });
        Object.assign(window, { fakeViewport: viewport });
      });
      await seedSettings(page, { customText: "بتن", language });
      await page.goto("/#/custom");
      const nav = page.getByRole("navigation", { name: copy.nav });
      await expect(nav).toBeVisible();
      await page.locator("[data-typing-surface]").click();
      await expect(nav).toBeVisible();
      const resize = (height: number | "full") =>
        page.evaluate((to) => {
          const viewport = (window as unknown as { fakeViewport: EventTarget & { height: number } }).fakeViewport;
          viewport.height = to === "full" ? window.innerHeight : to;
          viewport.dispatchEvent(new Event("resize"));
        }, height);
      await resize(480);
      await expect(nav).toBeHidden();
      await resize("full");
      await expect(nav).toBeVisible();
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
      await page.setViewportSize({ width: 1280, height: 800 });
      const names = PAGES.map((entry) => entry[language]).slice(0, 4);
      const expected = [copy.skip, ...names, copy.settings];
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
      await page.keyboard.press("Tab");
      await expect(page.getByRole("textbox", { name: copy.input })).toBeFocused();
    });

    test("on a phone the skip control and Settings come first and the four pages come after the content", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/#/practice");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[1][language]);
      await page.keyboard.press("Tab");
      expect(await focusedName(page)).toBe(copy.skip);
      await page.keyboard.press("Tab");
      expect(await focusedName(page)).toBe(copy.settings);
      const order = await page.evaluate(() => {
        const follows = (a: Element | null, b: Element | null) =>
          a !== null && b !== null && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
        const tabs = [...document.querySelectorAll("nav")].find((nav) => getComputedStyle(nav).display !== "none");
        return {
          settingsBeforeMain: follows(document.activeElement, document.querySelector("main")),
          mainBeforeTabs: follows(document.querySelector("main"), tabs ?? null),
        };
      });
      expect(order).toEqual({ settingsBeforeMain: true, mainBeforeTabs: true });
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
        expect(box?.height).toBeGreaterThanOrEqual(44);
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
      await page.setViewportSize({ width: 390, height: 844 });
      const session = await page.context().newCDPSession(page);
      await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { right: 40 } });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(PAGES[0][language]);
      for (const landmark of ["banner", "main"] as const) {
        const padding = await page.getByRole(landmark).evaluate((element) => {
          const style = getComputedStyle(element);
          return [style.paddingLeft, style.paddingRight];
        });
        expect(padding, landmark).toEqual(["20px", "40px"]);
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
  const mark = (element: Element): string =>
    `${getComputedStyle(element).borderBottomColor}|${getComputedStyle(element, "::after").backgroundColor}`;
  expect(await practice.evaluate(mark)).not.toBe(await recitation.evaluate(mark));
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

test("opening a surah from the map, and coming back to the map, start at the top with the heading focused", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  await page.goto("/");
  const surahs = page.getByRole("list", { name: "Surahs" }).getByRole("link");
  await surahs.last().scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
  await surahs.last().click();
  await expect(page).toHaveURL(/#\/recitation\/114$/);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText("·");
  await expect(heading).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Recitation" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Recitation" })).toBeFocused();
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

test("everything that can be pressed shows the pointer cursor", async ({ page, isMobile }) => {
  test.skip(isMobile, "a touch screen has no cursor");
  await page.goto("/#/custom");
  const cursorOf = (locator: Locator) => locator.evaluate((element) => getComputedStyle(element).cursor);
  expect(await cursorOf(page.getByRole("button", { name: "Settings" }))).toBe("pointer");
  expect(await cursorOf(page.getByRole("link", { name: "Practice" }))).toBe("pointer");
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  expect(await cursorOf(dialog.getByRole("radio", { name: "English" }))).toBe("pointer");
  expect(await cursorOf(dialog.getByRole("switch", { name: "Correct mistakes with Backspace" }))).toBe("pointer");
  expect(await cursorOf(dialog.getByRole("button", { name: "Done" }))).toBe("pointer");
});
