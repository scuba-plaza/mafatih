import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedSettings, seedSettings } from "./helpers/profile.ts";
import { addStyle, WIDE_LARGE_TEXT } from "./helpers/style.ts";
import { doneText, startTyping, surface, typeKeys } from "./helpers/typing.ts";

const KASRA = String.fromCodePoint(0x650);
const SUKUN = String.fromCodePoint(0x652);
const BISMI = `ب${KASRA}س${SUKUN}م${KASRA}`;

function opener(page: Page) {
  return page.getByRole("button", { name: "Settings" });
}

function dialog(page: Page) {
  return page.getByRole("dialog", { name: "Settings" });
}

async function openSettings(page: Page): Promise<void> {
  await opener(page).click();
  await expect(dialog(page)).toBeVisible();
}

async function closeSettings(page: Page): Promise<void> {
  await dialog(page).getByRole("button", { name: "Done" }).click();
  await expect(dialog(page)).toBeHidden();
}

function lessonText(page: Page) {
  return surface(page).locator("[data-lesson-text]");
}

test("the Settings button opens a dialog with every setting in a named group", async ({ page }) => {
  await page.goto("/#/custom");
  await openSettings(page);
  const language = dialog(page).getByRole("group", { name: "Language" });
  await expect(language.getByRole("radio")).toHaveCount(2);
  await expect(language.getByRole("radio", { name: "English" })).toBeChecked();
  await expect(language.getByText("العربية")).toHaveAttribute("lang", "ar");
  const vocalization = dialog(page).getByRole("group", { name: "Vocalization" });
  await expect(vocalization.getByRole("radio", { name: "Auto", exact: true })).toBeChecked();
  await expect(vocalization.getByRole("radio", { name: "Auto", exact: true })).toHaveAccessibleDescription(
    "Asks only for the marks you have unlocked in Practice.",
  );
  await expect(vocalization.getByRole("radio", { name: "Letters only", exact: true })).toHaveAccessibleDescription(
    "Marks are shown but not typed.",
  );
  await expect(vocalization.getByRole("radio", { name: "Harakat", exact: true })).toHaveAccessibleDescription(
    "Type fatha, damma, kasra, shadda and sukun.",
  );
  await expect(vocalization.getByRole("radio", { name: "Full", exact: true })).toHaveAccessibleDescription(
    "Type every mark, tanween included.",
  );
  const backspace = dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" });
  await expect(backspace).toBeChecked();
  await expect(backspace).toHaveAccessibleDescription(/Wrong keys are shown until you delete them/);
  const font = dialog(page).getByRole("group", { name: "Lesson font" });
  await expect(font.getByRole("radio")).toHaveCount(3);
  await expect(font.getByRole("radio", { name: "Scheherazade New", exact: true })).toBeChecked();
  await expect(dialog(page).getByRole("slider", { name: "Lesson text size" })).toHaveAttribute("aria-valuetext", "40");
  await expectNoAxeViolations(page);
});

test("Escape, Done and a click outside each close the dialog and give focus back to the Settings button", async ({
  page,
}) => {
  await page.goto("/#/custom");
  await openSettings(page);
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
  await openSettings(page);
  await closeSettings(page);
  await expect(opener(page)).toBeFocused();
  await openSettings(page);
  await page.mouse.click(4, 4);
  await expect(dialog(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

test("while the dialog is open the page behind it cannot be reached with Tab", async ({ page }) => {
  await page.goto("/#/custom");
  await openSettings(page);
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press("Tab");
    const inside = await page.evaluate(() => {
      const active = document.activeElement;
      return active === document.body || active?.closest("dialog") !== null;
    });
    expect(inside).toBe(true);
  }
});

test("changing the language applies at once, turns the page right-to-left and keeps the lesson where it was", async ({
  page,
}) => {
  await seedSettings(page, { customText: "بتن" });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  await openSettings(page);
  await dialog(page).getByRole("radio", { name: "العربية" }).check();
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  const arabic = page.getByRole("dialog", { name: "الإعدادات" });
  await expect(arabic).toBeVisible();
  await expect(arabic.getByRole("radio", { name: "English" })).not.toBeChecked();
  await expectNoAxeViolations(page);
  await arabic.getByRole("button", { name: "تم" }).click();
  expect(await doneText(page)).toBe("ب");
  expect((await savedSettings(page)).language).toBe("ar");
});

test("changing the vocalization starts the lesson afresh with the new marks to type", async ({ page }) => {
  await seedSettings(page, { customText: BISMI, vocalization: "letters" });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe(`ب${KASRA}`);
  await openSettings(page);
  await dialog(page).getByRole("radio", { name: "Full", exact: true }).check();
  await closeSettings(page);
  expect(await doneText(page)).toBe("");
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe("ب");
  expect((await savedSettings(page)).vocalization).toBe("full");
});

test("a finished summary goes away when a new vocalization changes the lesson", async ({ page }) => {
  await seedSettings(page, { customText: "بت" });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ب", "ت"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toBeFocused();
  await openSettings(page);
  await dialog(page).getByRole("radio", { name: "Letters only", exact: true }).check();
  await closeSettings(page);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toHaveCount(0);
  expect(await doneText(page)).toBe("");
});

test("turning off correction with Backspace keeps the lesson and applies from the next key", async ({ page }) => {
  await seedSettings(page, { customText: "بتن" });
  await page.goto("/#/custom");
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  await openSettings(page);
  await dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" }).uncheck();
  await closeSettings(page);
  await startTyping(page);
  expect(await doneText(page)).toBe("ب");
  await typeKeys(page, ["س"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await expect(surface(page).getByRole("status").filter({ hasText: "Mistake." })).toHaveCount(1);
  expect((await savedSettings(page)).requireBackspace).toBe(false);
});

test("every setting is still as it was left after a reload", async ({ page, isMobile }) => {
  await page.goto("/#/custom");
  await openSettings(page);
  await dialog(page).getByRole("radio", { name: "Harakat", exact: true }).check();
  await dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" }).uncheck();
  await dialog(page).getByRole("radio", { name: "Amiri", exact: true }).check();
  await dialog(page).getByRole("slider", { name: "Lesson text size" }).press("End");
  if (!isMobile) {
    await dialog(page).getByRole("switch", { name: "Show the keyboard" }).uncheck();
  }
  await page.reload();
  await openSettings(page);
  await expect(dialog(page).getByRole("radio", { name: "Harakat", exact: true })).toBeChecked();
  await expect(dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" })).not.toBeChecked();
  await expect(dialog(page).getByRole("radio", { name: "Amiri", exact: true })).toBeChecked();
  await expect(dialog(page).getByRole("slider", { name: "Lesson text size" })).toHaveAttribute("aria-valuetext", "72");
  if (!isMobile) {
    await expect(dialog(page).getByRole("switch", { name: "Show the keyboard" })).not.toBeChecked();
  }
});

test("the lesson font changes the lesson text only, and every choice previews itself", async ({ page }) => {
  await seedSettings(page, { customText: "بتن" });
  await page.goto("/#/custom");
  const bodyFont = await page.locator("body").evaluate((body) => getComputedStyle(body).fontFamily);
  await expect(lessonText(page)).toHaveCSS("font-family", /Scheherazade New/);
  await expect(page.locator("body")).toHaveCSS("font-family", /^"Noto Naskh Arabic"/);
  await expect(page.locator('[data-key="KeyS"]')).toHaveCSS("font-family", /^"Noto Naskh Arabic"/);
  await openSettings(page);
  const samples = dialog(page).locator("[data-font-sample]");
  await expect(samples).toHaveCount(3);
  await expect(samples.nth(0)).toHaveCSS("font-family", /Scheherazade New/);
  await expect(samples.nth(1)).toHaveCSS("font-family", /Amiri/);
  await expect(samples.nth(2)).toHaveCSS("font-family", /Noto Naskh Arabic/);
  await expect(samples.nth(2)).toHaveAttribute("lang", "ar");
  const spacing = await samples
    .nth(0)
    .evaluate(
      (sample) =>
        Number.parseFloat(getComputedStyle(sample).lineHeight) / Number.parseFloat(getComputedStyle(sample).fontSize),
    );
  expect(spacing).toBeGreaterThanOrEqual(1.75);
  await dialog(page).getByRole("radio", { name: "Amiri", exact: true }).check();
  await expect(lessonText(page)).toHaveCSS("font-family", /Amiri/);
  await expect(page.locator("body")).toHaveCSS("font-family", bodyFont);
  await expect(page.locator('[data-key="KeyS"]')).toHaveCSS("font-family", bodyFont);
  await expect(dialog(page).getByRole("heading", { name: "Settings" })).toHaveCSS("font-family", bodyFont);
  expect(await page.evaluate(() => document.fonts.check('40px "Amiri"'))).toBe(true);
});

test("the text size slider works from the keyboard, says its value and resizes the lesson text", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedSettings(page, { customText: "بتن" });
  await page.goto("/#/custom");
  await openSettings(page);
  const slider = dialog(page).getByRole("slider", { name: "Lesson text size" });
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(slider).toHaveAttribute("aria-valuetext", "44");
  await expect(lessonText(page)).toHaveCSS("font-size", "44px");
  await page.keyboard.press("Home");
  await expect(slider).toHaveAttribute("aria-valuetext", "28");
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", "72");
  await expect(lessonText(page)).toHaveCSS("font-size", "72px");
  expect((await savedSettings(page)).fontSize).toBe(72);
});

test("on a phone the dialog is a sheet along the bottom edge that scrolls inside itself", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto("/#/custom");
  await openSettings(page);
  const box = await dialog(page).boundingBox();
  expect(box?.x).toBe(0);
  expect(box?.width).toBe(360);
  expect((box?.y ?? 0) + (box?.height ?? 0)).toBe(640);
  expect(box?.y).toBeGreaterThan(40);
  await dialog(page).evaluate((element) => element.scrollTo(0, element.scrollHeight));
  await expect(dialog(page).getByRole("button", { name: "Done" })).toBeInViewport({ ratio: 1 });
  expect(await dialog(page).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await expectNoAxeViolations(page);
});

function centre(box: { y: number; height: number } | null): number {
  return (box?.y ?? 0) + (box?.height ?? 0) / 2;
}

test("at 320 pixels nothing in the dialog or the header is cut off or scrolls sideways", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#/custom");
  const settings = await opener(page).boundingBox();
  const mark = await page.getByRole("img", { name: "Mafatih" }).boundingBox();
  expect(Math.abs(centre(settings) - centre(mark))).toBeLessThanOrEqual(4);
  expect(settings?.width).toBeGreaterThanOrEqual(44);
  expect(settings?.height).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  await openSettings(page);
  expect(await dialog(page).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
});

test("on a wide screen the dialog stands in the middle", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/#/custom");
  await openSettings(page);
  const box = await dialog(page).boundingBox();
  const left = box?.x ?? 0;
  const right = 1280 - left - (box?.width ?? 0);
  expect(left).toBeGreaterThan(200);
  expect(Math.abs(left - right)).toBeLessThanOrEqual(1);
  expect(box?.y).toBeGreaterThan(0);
});

test("opened and closed from the keyboard, the dialog gives focus back to the Settings button", async ({ page }) => {
  await page.goto("/#/custom");
  await opener(page).focus();
  await page.keyboard.press("Enter");
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
  await expect(opener(page)).toBeFocused();
});

test("at 320 pixels with text at 200 percent the dialog still fits and its Done button can be reached", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/#/custom");
  await addStyle(page, WIDE_LARGE_TEXT);
  await openSettings(page);
  expect(await dialog(page).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  await expect(dialog(page).getByRole("button", { name: "Done" })).toBeInViewport({ ratio: 1 });
});

test("on a landscape phone with a display cutout the dialog keeps its content out of the cutout", async ({ page }) => {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { left: 44, right: 44 } });
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/#/custom");
  await openSettings(page);
  const title = await dialog(page).getByRole("heading", { name: "Settings" }).boundingBox();
  const done = await dialog(page).getByRole("button", { name: "Done" }).boundingBox();
  const radio = await dialog(page).getByRole("radio", { name: "English" }).boundingBox();
  expect(title?.x).toBeGreaterThanOrEqual(44);
  expect((done?.x ?? 0) + (done?.width ?? 0)).toBeLessThanOrEqual(667 - 44);
  expect(radio?.x).toBeGreaterThanOrEqual(44);
});

test("the dialog always opens at its top, however far it was scrolled when it was closed", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 500 });
  await page.goto("/#/custom");
  await openSettings(page);
  await dialog(page).evaluate((element) => element.scrollTo(0, 300));
  expect(await dialog(page).evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await openSettings(page);
  expect(await dialog(page).evaluate((element) => element.scrollTop)).toBe(0);
});

test("while the dialog is open the page behind it does not scroll, and it scrolls again afterwards", async ({
  page,
}) => {
  await page.goto("/#/custom");
  await page.evaluate(() => {
    document.body.style.minHeight = "3000px";
  });
  await openSettings(page);
  await page.mouse.move(4, 4);
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.keyboard.press("Escape");
  await page.mouse.wheel(0, 600);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
});

test("a switch shows its state by where its thumb stands, in both reading directions", async ({ page }) => {
  const thumb = (language: "en" | "ar") =>
    page
      .getByRole("dialog")
      .getByRole("switch", {
        name: language === "en" ? "Correct mistakes with Backspace" : "تصحيح الأخطاء بمفتاح الحذف",
      })
      .evaluate((element) => {
        const shift = getComputedStyle(element, "::before").translate;
        return shift === "none" ? 0 : Number.parseFloat(shift);
      });
  await page.goto("/#/custom");
  await openSettings(page);
  expect(await thumb("en")).toBe(16);
  await dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" }).uncheck();
  await expect.poll(() => thumb("en")).toBe(0);
  await dialog(page).getByRole("radio", { name: "العربية" }).check();
  await page.getByRole("dialog").getByRole("switch", { name: "تصحيح الأخطاء بمفتاح الحذف" }).check();
  await expect.poll(() => thumb("ar")).toBe(-16);
});

test("with forced colours a switch is the browser's own checkbox again", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.goto("/#/custom");
  await openSettings(page);
  const backspace = dialog(page).getByRole("switch", { name: "Correct mistakes with Backspace" });
  expect(await backspace.evaluate((element) => getComputedStyle(element).appearance)).toBe("auto");
  expect(await backspace.evaluate((element) => getComputedStyle(element, "::before").display)).toBe("none");
});

test("a font that cannot be loaded does not break the page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/assets\/arabic-400-[^/]*\.css$/, (route) => route.abort());
  await page.goto("/#/custom");
  await openSettings(page);
  await dialog(page).getByRole("radio", { name: "Amiri", exact: true }).check();
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
  await expect(dialog(page)).toBeVisible();
});

for (const [language, locale, settingsName, appName] of [
  ["English", "en-US", "Settings", "Mafatih"],
  ["Arabic", "ar-EG", "الإعدادات", "مفاتيح"],
] as const) {
  test.describe(`${language} header at 320 pixels`, () => {
    test.use({ locale });

    test("the top bar keeps the wordmark and Settings on one row and the bottom bar its four links, even with wider letters than the system font's", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/#/custom");
      await addStyle(page, "body { letter-spacing: 0.04em; }");
      const settings = await page.getByRole("button", { name: settingsName }).boundingBox();
      const mark = await page.getByRole("img", { name: appName }).boundingBox();
      expect(Math.abs(centre(settings) - centre(mark))).toBeLessThanOrEqual(4);
      const links = page.locator("[data-tabbar]").getByRole("link");
      await expect(links).toHaveCount(4);
      const rows = await links.evaluateAll((all) => all.map((link) => Math.round(link.getBoundingClientRect().y)));
      expect(new Set(rows).size).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(
        0,
      );
    });

    test("with text enlarged by half the Settings button stays on the top row", async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("/#/custom");
      await addStyle(page, "html { font-size: 150%; }");
      const settings = await page.getByRole("button", { name: settingsName }).boundingBox();
      const mark = await page.getByRole("img", { name: appName }).boundingBox();
      expect(Math.abs(centre(settings) - centre(mark))).toBeLessThanOrEqual(4);
    });
  });
}

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG", colorScheme: "dark" });

  test("the dialog works in Arabic and in the dark scheme", async ({ page }) => {
    await page.goto("/#/custom");
    await page.getByRole("button", { name: "الإعدادات" }).click();
    const arabic = page.getByRole("dialog", { name: "الإعدادات" });
    await expect(arabic.getByRole("group", { name: "اللغة" }).getByRole("radio", { name: "العربية" })).toBeChecked();
    await expect(arabic.getByText("English")).toHaveAttribute("lang", "en");
    await expect(arabic.getByRole("slider", { name: "حجم نص الدرس" })).toHaveAttribute("aria-valuetext", "٤٠");
    await expectNoAxeViolations(page);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "الإعدادات" })).toBeFocused();
  });
});
