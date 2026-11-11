import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { clearlyDifferentPixels } from "./helpers/pixels.ts";
import { seedSettings } from "./helpers/profile.ts";
import { doneText, shownText, surface, typeKeys } from "./helpers/typing.ts";

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
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(page.getByRole("textbox", { name: "Type the text shown" })).toBeFocused();
}

function finished(page: Page) {
  return page.getByRole("region", { name: "Finished" });
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
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
  expect(await doneText(page)).toBe(BISMI);
});

test("with full vocalization every mark has to be typed", async ({ page }) => {
  await start(page, { customText: BISMI, vocalization: "full" });
  await typeKeys(page, ["ب", "س"]);
  expect(await doneText(page)).toBe("ب");
  expect(await shownText(page)).toBe(`بس${KASRA}س${SUKUN}م${KASRA}`);
  await typeKeys(page, ["Backspace", KASRA, "س", SUKUN, "م", KASRA]);
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("1");
});

test("a shadda and its vowel are accepted in either order", async ({ page }) => {
  const text = `رب${SHADDA}${FATHA}`;
  await start(page, { customText: text, vocalization: "full" });
  await typeKeys(page, ["ر", "ب", FATHA, SHADDA]);
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
  await finished(page).getByRole("button", { name: "Type again" }).click();
  await typeKeys(page, ["ر", "ب", SHADDA, FATHA]);
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
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
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("2");
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

test("a mistake is announced once, with what to do about it", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["س"]);
  await expect(surface(page).getByRole("status")).toHaveText(/^Mistake\. Press Backspace\.\s?$/);
});

test("without the Backspace setting a wrong key is flagged and announced but never shown", async ({ page }) => {
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["ب", "س"]);
  await expect(surface(page)).toHaveAttribute("data-error", "");
  await expect(surface(page).getByRole("status")).toHaveText(/^Mistake\.\s?$/);
  expect(await shownText(page)).toBe("بتن");
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await expect(surface(page)).not.toHaveAttribute("data-error");
  await typeKeys(page, ["Backspace", "ت", "ن"]);
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("1");
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
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
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
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
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
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
});

test("leaving the text pauses typing and offers to continue where it stopped", async ({ page }) => {
  await open(page, { customText: "بتن" });
  const begin = page.getByRole("button", { name: "Start typing" });
  await expect(begin).toBeVisible();
  await begin.click();
  await expect(begin).toHaveCount(0);
  await typeKeys(page, ["ب"]);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Edit text" })).toBeFocused();
  const resume = page.getByRole("button", { name: "Continue typing" });
  await expect(resume).toBeVisible();
  await resume.click();
  await expect(resume).toHaveCount(0);
  await typeKeys(page, ["ت", "ن"]);
  await expect(finished(page).getByRole("definition").nth(2)).toHaveText("0");
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

for (const [font, family] of [
  ["noto-naskh", "Noto Naskh Arabic"],
  ["scheherazade", "Scheherazade New"],
  ["amiri", "Amiri"],
] as const) {
  test(`${family}: marking text as done never changes how the letters are shaped or joined`, async ({ page }) => {
    await start(page, { customText: "بِسْمِ اللَّهِ الرَّحْمَٰنِ", vocalization: "letters", font });
    await page.addStyleTag({
      content: "::highlight(mafatih-done){color:currentColor} [data-caret]{visibility:hidden}",
    });
    await typeKeys(page, ["ب", "س", "م", " ", "ا", "ل"]);
    expect(await doneText(page)).not.toBe("");
    await page.evaluate((name) => document.fonts.load(`40px "${name}"`), family);
    expect(await page.evaluate((name) => document.fonts.check(`40px "${name}"`), family)).toBe(true);
    const text = surface(page).locator("[data-lesson-text]");
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
