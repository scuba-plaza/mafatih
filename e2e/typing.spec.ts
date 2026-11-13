import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { clearlyDifferentPixels } from "./helpers/pixels.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle } from "./helpers/style.ts";
import { doneText, shownText, startTyping, surface, typeKeys } from "./helpers/typing.ts";

const FATHA = String.fromCodePoint(0x64e);
const KASRA = String.fromCodePoint(0x650);
const SHADDA = String.fromCodePoint(0x651);
const SUKUN = String.fromCodePoint(0x652);
const BISMI = `ب${KASRA}س${SUKUN}م${KASRA}`;
const LONG = "كتب من بيت كل يوم ".repeat(20).trim();

async function open(page: Page, settings: Record<string, unknown>): Promise<void> {
  await seedSettings(page, settings);
  await page.goto("/#/custom");
  await expect(surface(page)).toBeVisible();
}

async function start(page: Page, settings: Record<string, unknown>): Promise<void> {
  await open(page, settings);
  await startTyping(page);
  await expect(field(page)).toBeFocused();
}

function finished(page: Page) {
  return page.getByRole("heading", { level: 2, name: "Finished" });
}

function mistakeCount(page: Page) {
  return page.getByRole("definition").nth(2);
}

function field(page: Page) {
  return page.getByRole("textbox", { name: "Type the text shown" });
}

function flag(page: Page) {
  return surface(page).getByRole("status").filter({ hasText: "Mistake" });
}

function lessonText(page: Page) {
  return surface(page).locator("[data-lesson-text]");
}

async function caretBox(page: Page): Promise<{ x: number; y: number; height: number }> {
  const box = await surface(page).locator("[data-caret]").boundingBox();
  return { x: box?.x ?? Number.NaN, y: box?.y ?? Number.NaN, height: box?.height ?? 0 };
}

test("with letters only, the marks stay on screen but only the letters are typed", async ({ page }) => {
  await start(page, { customText: BISMI, vocalization: "letters" });
  expect(await shownText(page)).toBe(BISMI);
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe(`ب${KASRA}`);
  expect(await shownText(page)).toBe(BISMI);
  await typeKeys(page, ["س", "م"]);
  await expect(mistakeCount(page)).toHaveText("0");
  expect(await doneText(page)).toBe(BISMI);
});

test("with full vocalization every mark has to be typed", async ({ page }) => {
  await start(page, { customText: BISMI, vocalization: "full" });
  await typeKeys(page, ["ب", "س"]);
  expect(await doneText(page)).toBe("ب");
  expect(await shownText(page)).toBe(`بس${KASRA}س${SUKUN}م${KASRA}`);
  await typeKeys(page, ["Backspace", KASRA, "س", SUKUN, "م", KASRA]);
  await expect(mistakeCount(page)).toHaveText("1");
});

test("a shadda and its vowel are accepted in either order", async ({ page }) => {
  const text = `رب${SHADDA}${FATHA}`;
  await start(page, { customText: text, vocalization: "full" });
  await typeKeys(page, ["ر", "ب", FATHA, SHADDA]);
  await expect(mistakeCount(page)).toHaveText("0");
  await page.getByRole("button", { name: "Type again" }).click();
  await typeKeys(page, ["ر", "ب", SHADDA, FATHA]);
  await expect(mistakeCount(page)).toHaveText("0");
});

test("a wrong key appears at the cursor, in order, with the expected text still whole after it", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["ب", "س", "ش"]);
  expect(await shownText(page)).toBe("بسشتن");
  expect(await doneText(page)).toBe("ب");
  const mistakes = surface(page).locator("[data-mistakes]");
  await expect(mistakes).toHaveText("سش");
  await expect(mistakes).toHaveAttribute("aria-hidden", "true");
  await expect(mistakes).toHaveCSS("text-decoration-style", "wavy");
});

test("the right key is also a mistake until the wrong ones are deleted with Backspace", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["ب", "س", "ت"]);
  expect(await shownText(page)).toBe("بستتن");
  await typeKeys(page, ["Backspace", "Backspace"]);
  expect(await shownText(page)).toBe("بتن");
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await typeKeys(page, ["ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("2");
});

test("Backspace never removes text that was typed correctly", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["ب", "ت", "Backspace", "Backspace", "Backspace"]);
  expect(await doneText(page)).toBe("بت");
  expect(await shownText(page)).toBe("بتن");
});

test("a mistyped space is shown as a visible mark", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["ب", " "]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("␣");
});

test("a mistake is flagged in words once, until the wrong keys are deleted", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await expect(flag(page)).toHaveCount(0);
  await typeKeys(page, ["س"]);
  await expect(flag(page)).toHaveText("Mistake. Press Backspace.");
  await expect(flag(page)).toBeVisible();
  await typeKeys(page, ["ش", "Backspace"]);
  await expect(flag(page)).toHaveText("Mistake. Press Backspace.");
  await typeKeys(page, ["Backspace"]);
  await expect(flag(page)).toHaveCount(0);
});

test("without the Backspace setting a wrong key is blocked, and flagged in words until the right key is typed", async ({
  page,
}) => {
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["ب", "س"]);
  await expect(flag(page)).toHaveText("Mistake.");
  await expect(flag(page)).toBeVisible();
  expect(await shownText(page)).toBe("بتن");
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await typeKeys(page, ["Backspace"]);
  await expect(flag(page)).toHaveText("Mistake.");
  await typeKeys(page, ["ت"]);
  await expect(flag(page)).toHaveCount(0);
  await typeKeys(page, ["ن"]);
  await expect(mistakeCount(page)).toHaveText("1");
});

test("typing again starts clean: nothing of the last attempt is flagged or announced", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["س", "Backspace", "ب", "ت", "ن"]);
  await expect(finished(page)).toBeFocused();
  await page.getByRole("button", { name: "Type again" }).click();
  await expect(field(page)).toBeFocused();
  await expect(surface(page).getByText(/Mistake|Finished/)).toHaveCount(0);
  await expect(flag(page)).toHaveCount(0);
  expect(await doneText(page)).toBe("");
});

test("a digit or sign typed by mistake is shown like any other wrong key", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["5", "!"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("5!");
});

test("a mark typed by mistake with no letter to sit on is drawn on a tatweel, so it can be seen", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const mistakes = surface(page).locator("[data-mistakes]");
  await typeKeys(page, [FATHA]);
  await expect(mistakes).toHaveText(`ــ${FATHA}`);
  expect((await mistakes.boundingBox())?.width).toBeGreaterThan(6);
  await typeKeys(page, ["Backspace", "ب", " ", FATHA, "س", KASRA]);
  await expect(mistakes).toHaveText(`␣ــ${FATHA}س${KASRA}`);
});

test("a screen reader hears the word to type next: on entering the field and after each word", async ({ page }) => {
  await start(page, { customText: "بت نم كل" });
  const next = surface(page).locator('[role="status"][lang="ar"]');
  await expect(field(page)).toHaveAccessibleDescription("بت");
  await expect(next).toHaveText("بت");
  await typeKeys(page, ["ب"]);
  await expect(next).toHaveText("بت");
  await typeKeys(page, ["ت"]);
  await expect(next).toHaveText("نم");
  await typeKeys(page, [" ", "ن", "م", " "]);
  await expect(field(page)).toHaveAccessibleDescription("كل");
  await typeKeys(page, ["ك", "ل"]);
  await expect(next).toHaveText("");
});

test("there is no start button: clicking the text starts typing", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await open(page, { customText: "بسم الله الرحمن الرحيم" });
  await expect(page.getByRole("button", { name: /Start typing|Continue typing/ })).toHaveCount(0);
  const text = await lessonText(page).boundingBox();
  await page.mouse.click((text?.x ?? 0) + (text?.width ?? 0) / 2, (text?.y ?? 0) + (text?.height ?? 0) / 2);
  await expect(field(page)).toBeFocused();
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe("ب");
});

test("the text can be reached with Tab and left with Tab, and no ring is drawn around it", async ({ page }) => {
  await open(page, { customText: "بتن" });
  await page.getByRole("heading", { level: 1 }).focus();
  await page.keyboard.press("Tab");
  await expect(field(page)).toBeFocused();
  await expect(surface(page)).not.toHaveCSS("outline-style", "solid");
  await typeKeys(page, ["ب"]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Edit text" })).toBeFocused();
  await expect(surface(page)).not.toHaveCSS("outline-style", "solid");
  await surface(page).click();
  await expect(field(page)).toBeFocused();
  await expect(surface(page)).not.toHaveCSS("outline-style", "solid");
});

test("while it waits the caret blinks, and while typing or with reduced motion it stands still", async ({ page }) => {
  await open(page, { customText: "بتن" });
  const caret = surface(page).locator("[data-caret]");
  await expect(caret).toHaveCSS("animation-name", "caret-wait");
  await expect(caret).toHaveCSS("animation-duration", "2.4s");
  await startTyping(page);
  await expect(caret).toHaveCSS("animation-name", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.keyboard.press("Tab");
  await expect(caret).toHaveCSS("animation-name", "none");
});

test("the lesson can be started, left, continued and finished from the keyboard alone", async ({ page }) => {
  await open(page, { customText: "بتن" });
  await page.getByRole("heading", { level: 1 }).focus();
  await page.keyboard.press("Tab");
  await expect(field(page)).toBeFocused();
  await typeKeys(page, ["ب"]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Edit text" })).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(field(page)).toBeFocused();
  await typeKeys(page, ["ت", "ن"]);
  await expect(finished(page)).toBeFocused();
  await expect(field(page)).toBeDisabled();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Type again" })).toBeFocused();
});

test("typing on a Latin layout is explained instead of being counted as mistakes", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["a", "b"]);
  await expect(surface(page).getByRole("alert")).toHaveText(
    "Your keyboard is not typing Arabic. Switch it to the Arabic layout.",
  );
  expect(await shownText(page)).toBe("بتن");
  await expectNoAxeViolations(page);
  await typeKeys(page, ["ب"]);
  await expect(surface(page).getByRole("alert")).toHaveCount(0);
  await typeKeys(page, ["ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
});

test("the wrong-layout message goes away when the field is left", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["a"]);
  await expect(surface(page).getByRole("alert")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(surface(page).getByRole("alert")).toHaveCount(0);
});

test("pasted or swiped text is not typing", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["بتن", "كتاب"]);
  expect(await doneText(page)).toBe("");
  expect(await shownText(page)).toBe("بتن");
  await expect(finished(page)).toHaveCount(0);
});

test("Backspace as the very first key is harmless", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["Backspace", "Backspace", "ب", "ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
});

test("a keyboard that builds each word as a composition types one key per letter", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const session = await page.context().newCDPSession(page);
  await session.send("Input.imeSetComposition", { text: "ب", selectionStart: 1, selectionEnd: 1 });
  expect(await doneText(page)).toBe("ب");
  await session.send("Input.imeSetComposition", { text: "بت", selectionStart: 2, selectionEnd: 2 });
  expect(await doneText(page)).toBe("بت");
  await session.send("Input.insertText", { text: "بت" });
  expect(await doneText(page)).toBe("بت");
  await typeKeys(page, ["ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
});

test("leaving the text pauses typing, and clicking it again continues where it stopped", async ({ page }) => {
  await open(page, { customText: "بتن" });
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Edit text" })).toBeFocused();
  await expect(field(page)).not.toBeFocused();
  await startTyping(page);
  await expect(field(page)).toBeFocused();
  await typeKeys(page, ["ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
});

test("untyped text is dim and typed text is bright", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const untyped = await lessonText(page).evaluate((element) => getComputedStyle(element).color);
  expect(untyped).toBe("rgb(91, 93, 97)");
  await typeKeys(page, ["ب"]);
  const typed = await lessonText(page).evaluate(
    (element) => getComputedStyle(element, "::highlight(mafatih-done)").color,
  );
  expect(typed).toBe("rgb(235, 232, 226)");
});

test("a quiet line under the text shows speed, accuracy, mistakes and time on a wide screen", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "phones keep the screen quiet");
  await start(page, { customText: "بتن كتب" });
  const live = page.locator("[data-live-stats]");
  await expect(live).toBeHidden();
  await typeKeys(page, ["ب", "س"]);
  await expect(live).toBeVisible();
  await expect(live).toHaveAttribute("aria-hidden", "true");
  await expect(live).toContainText("cpm");
  await expect(live).toContainText("50%");
  await expect(live).toContainText("Errors 1");
  await expect(live).toContainText("0:0");
});

test("the live line is not drawn on a phone", async ({ page, isMobile }) => {
  test.skip(!isMobile, "wide screens show it");
  await start(page, { customText: "بتن كتب" });
  await typeKeys(page, ["ب", "س"]);
  await expect(page.locator("[data-live-stats]")).toBeHidden();
});

test("the text is one uninterrupted run, split only where mistakes are shown", async ({ page }) => {
  await start(page, { customText: "بتن كتب" });
  const nodes = () =>
    surface(page)
      .locator("[data-block]")
      .evaluate((block) => block.childNodes.length);
  await typeKeys(page, ["ب", "ت"]);
  expect(await nodes()).toBe(1);
  await typeKeys(page, ["س"]);
  expect(await nodes()).toBe(3);
  await typeKeys(page, ["Backspace"]);
  expect(await nodes()).toBe(1);
});

test("the caret stands before the next letter and moves leftwards as the Arabic text is typed", async ({ page }) => {
  await start(page, { customText: "بتن كتب" });
  const first = await caretBox(page);
  expect(first.height).toBeGreaterThan(20);
  await typeKeys(page, ["ب"]);
  const second = await caretBox(page);
  expect(second.x).toBeLessThan(first.x);
  expect(second.y).toBe(first.y);
  await typeKeys(page, ["س"]);
  const third = await caretBox(page);
  expect(third.x).toBeLessThan(second.x);
  await typeKeys(page, ["Backspace", "ت", "ن", " ", "ك", "ت", "ب"]);
  await expect(surface(page).locator("[data-caret]")).toBeHidden();
});

test("on a short screen with the keyboard open the line being typed stays in view", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 300 });
  await start(page, { customText: LONG, fontSize: 28 });
  const words = LONG.split(" ");
  await typeKeys(page, [...words.slice(0, 40).join(" ")]);
  await expect(surface(page).locator("[data-caret]")).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  const caret = await caretBox(page);
  expect(caret.y).toBeGreaterThanOrEqual(0);
  expect(caret.y + caret.height).toBeLessThanOrEqual(300);
});

test("a browser without text highlighting still shows the caret and the mistakes and can finish", async ({ page }) => {
  await page.addInitScript(() => {
    Reflect.deleteProperty(CSS, "highlights");
  });
  await start(page, { customText: "بتن" });
  expect(await page.evaluate(() => "highlights" in CSS)).toBe(false);
  await typeKeys(page, ["ب", "س"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("س");
  expect((await caretBox(page)).height).toBeGreaterThan(20);
  await typeKeys(page, ["Backspace", "ت", "ن"]);
  await expect(finished(page)).toBeVisible();
});

test("the typing page has no accessibility violations while typing, with mistakes pending", async ({ page }) => {
  await start(page, { customText: "بتن كتب" });
  await typeKeys(page, ["ب", "س"]);
  await expectNoAxeViolations(page);
});

test("on a phone every text size is a different size, and the largest still fits with mistakes shown", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const sizes: number[] = [];
  await page.goto("/#/custom");
  for (const fontSize of [28, 40, 72]) {
    await seedSettings(page, { customText: "استراتيجيات كتب من بيت", fontSize });
    await page.reload();
    sizes.push(await lessonText(page).evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)));
  }
  const [small = 0, normal = 0, large = 0] = sizes;
  expect(small).toBeGreaterThanOrEqual(16);
  expect(normal).toBeGreaterThan(small + 4);
  expect(large).toBeGreaterThan(normal + 12);
  await startTyping(page);
  await typeKeys(page, [..."سسسسسسسسسسسس"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("سسسسسسسسسس");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  expect(await lessonText(page).evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(
    0,
  );
});

test("on a wide screen the text is drawn at exactly the chosen size", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await open(page, { customText: "بتن", fontSize: 72 });
  await expect(lessonText(page)).toHaveCSS("font-size", "72px");
});

test("in forced colours the caret is still drawn", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await start(page, { customText: "بتن" });
  const [caret, canvas] = await surface(page).evaluate((section) => {
    const mark = section.querySelector("[data-caret]");
    return [mark === null ? "" : getComputedStyle(mark).backgroundColor, getComputedStyle(section).backgroundColor];
  });
  expect(caret).not.toBe(canvas);
  expect(caret).not.toBe("rgba(0, 0, 0, 0)");
  expect((await caretBox(page)).height).toBeGreaterThan(20);
});

test.describe("dark", () => {
  test.use({ colorScheme: "dark" });

  test("the typing page has no accessibility violations in the dark scheme, with a mistake flagged", async ({
    page,
  }) => {
    await start(page, { customText: "بتن كتب" });
    await typeKeys(page, ["ب", "س"]);
    await expect(flag(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });
});

for (const [font, family] of [
  ["noto-naskh", "Noto Naskh Arabic"],
  ["scheherazade", "Scheherazade New"],
  ["amiri", "Amiri"],
] as const) {
  test(`${family}: marking text as done never changes how the letters are shaped or joined`, async ({ page }) => {
    await start(page, { customText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ", vocalization: "letters", font });
    await addStyle(page, "::highlight(mafatih-done){color:currentColor} [data-caret]{visibility:hidden}");
    await typeKeys(page, ["ب", "س", "م", " ", "ا", "ل"]);
    expect(await doneText(page)).not.toBe("");
    await page.evaluate((name) => document.fonts.load(`40px "${name}"`), family);
    expect(await page.evaluate((name) => document.fonts.check(`40px "${name}"`), family)).toBe(true);
    const text = lessonText(page);
    await expect(text).toHaveCSS("font-family", new RegExp(family));
    const marked = await text.screenshot();
    await page.evaluate(() => CSS.highlights.clear());
    const plain = await text.screenshot();
    expect(await clearlyDifferentPixels(page, marked, plain)).toBeLessThan(30);
    await text.evaluate((element) => {
      const paragraph = element.querySelector("[data-block]");
      if (paragraph !== null) {
        paragraph.textContent = (paragraph.textContent ?? "").replace("ل", "ل\u200C");
      }
    });
    const broken = await text.screenshot();
    expect(await clearlyDifferentPixels(page, plain, broken)).toBeGreaterThan(100);
  });
}
