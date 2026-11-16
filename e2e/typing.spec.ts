import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { NEEDS_CDP } from "./helpers/engines.ts";
import { brightestPixel, clearlyDifferentPixels } from "./helpers/pixels.ts";
import { emulatePlatform } from "./helpers/platform.ts";
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

function activateButton(page: Page, name = "Click or press Enter to activate…") {
  return surface(page).getByRole("button", { name });
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
  await expect(mistakes).toHaveCSS("text-decoration-line", "none");
  await expect(mistakes).toHaveCSS("color", DANGER);
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
  await typeKeys(page, ["ب", "س"]);
  await expect(flag(page)).toHaveText("Mistake. Press Backspace.");
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
  expect(await shownText(page)).toBe("بتن");
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await typeKeys(page, ["Backspace"]);
  await expect(flag(page)).toHaveText("Mistake.");
  await typeKeys(page, ["ت"]);
  await expect(flag(page)).toHaveCount(0);
  await typeKeys(page, ["ن"]);
  await expect(mistakeCount(page)).toHaveText("1");
});

const DANGER = "rgb(252, 165, 165)";
const ACCENT = "rgb(226, 176, 98)";

function caret(page: Page) {
  return surface(page).locator("[data-caret]");
}

async function caretColour(page: Page): Promise<string> {
  return caret(page).evaluate((element) => getComputedStyle(element).backgroundColor);
}

interface Shake {
  readonly moves: boolean;
  readonly ring: string;
  readonly colour: string;
}

async function countShakes(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const original = Element.prototype.animate;
    Object.assign(window, { shakes: [] });
    Element.prototype.animate = function (keyframes, options) {
      const animation = original.call(this, keyframes, options);
      if (typeof options === "object" && options.id === "caret-miss" && this.hasAttribute("data-caret")) {
        const style = getComputedStyle(this);
        const list = (window as unknown as { shakes: Shake[] }).shakes;
        list.push({
          moves: Array.isArray(keyframes) && keyframes.some((frame) => "translate" in frame),
          ring: style.boxShadow,
          colour: style.backgroundColor,
        });
      }
      return animation;
    };
  });
}

async function shakeLog(page: Page): Promise<Shake[]> {
  return page.evaluate(() => (window as unknown as { shakes: Shake[] }).shakes);
}

async function shakes(page: Page): Promise<number> {
  return (await shakeLog(page)).length;
}

function shaking(page: Page): Promise<boolean> {
  return caret(page).evaluate((element) => element.getAnimations().some((animation) => animation.id === "caret-miss"));
}

test("the caret shakes and flashes once for every wrong key, which is exactly how mistakes are counted", async ({
  page,
}) => {
  await countShakes(page);
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["ب"]);
  expect(await shakes(page)).toBe(0);
  await typeKeys(page, ["س"]);
  await expect.poll(() => shakes(page)).toBe(1);
  const said = await flag(page).boundingBox();
  expect(said?.width).toBeLessThanOrEqual(1);
  expect(said?.height).toBeLessThanOrEqual(1);
  await typeKeys(page, ["ش"]);
  await expect.poll(() => shakes(page)).toBe(2);
  await typeKeys(page, ["ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("2");
  expect(await shakes(page)).toBe(2);
});

test("a wrong key before the first correct character shakes the caret but counts for nothing: no mistake, no clock", async ({
  page,
}) => {
  await countShakes(page);
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["س"]);
  await expect.poll(() => shakes(page)).toBe(1);
  await typeKeys(page, ["ش"]);
  await expect.poll(() => shakes(page)).toBe(2);
  await expect(flag(page)).toHaveCount(0);
  await typeKeys(page, ["Backspace"]);
  await typeKeys(page, ["ب", "ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
  expect(await shakes(page)).toBe(2);
});

test("pressing on the text, leaving the field and coming back never replays a shake", async ({ page }) => {
  await countShakes(page);
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["ب", "س"]);
  await expect.poll(() => shakes(page)).toBe(1);
  await expect.poll(() => shaking(page)).toBe(false);
  await page.mouse.click(4, 4);
  await expect(field(page)).not.toBeFocused();
  await surface(page).click();
  await expect(field(page)).toBeFocused();
  await surface(page).click();
  await page.waitForTimeout(150);
  expect(await shaking(page)).toBe(false);
  expect(await shakes(page)).toBe(1);
});

test("with reduced motion the caret does not move, but it still turns red and gets a ring", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await countShakes(page);
  await start(page, { customText: "بتن", requireBackspace: false });
  await typeKeys(page, ["ب", "س"]);
  await expect.poll(() => shakes(page)).toBe(1);
  const [style] = await shakeLog(page);
  expect(style?.moves).toBe(false);
  expect(style?.ring).toBe(`${DANGER} 0px 0px 0px 2px`);
  expect(style?.colour).toBe(DANGER);
  await expect.poll(() => caretColour(page)).toBe(ACCENT);
});

test("while wrong keys are waiting to be deleted the caret stays red, and goes back when they are gone", async ({
  page,
}) => {
  await start(page, { customText: "بتن", requireBackspace: true });
  await typeKeys(page, ["ب"]);
  expect(await caretColour(page)).toBe(ACCENT);
  await typeKeys(page, ["س"]);
  await expect.poll(() => caretColour(page)).toBe(DANGER);
  await page.waitForTimeout(700);
  expect(await caretColour(page)).toBe(DANGER);
  await typeKeys(page, ["Backspace"]);
  await expect.poll(() => caretColour(page)).toBe(ACCENT);
});

test("holding a key down is one key press, not several", async ({ browserName, page, isMobile }) => {
  test.skip(browserName !== "chromium", NEEDS_CDP);
  test.skip(isMobile, "a phone has no key to hold");
  await start(page, { customText: "ببب" });
  const cdp = await page.context().newCDPSession(page);
  const press = (type: "keyDown" | "keyUp", autoRepeat: boolean) =>
    cdp.send("Input.dispatchKeyEvent", {
      type,
      key: "ب",
      text: type === "keyDown" ? "ب" : undefined,
      autoRepeat,
    });
  await press("keyDown", false);
  await press("keyDown", true);
  await press("keyDown", true);
  await press("keyUp", false);
  expect((await doneText(page)).length).toBe(1);
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
  await typeKeys(page, ["ب"]);
  expect((await doneText(page)).length).toBe(2);
});

test("holding Backspace still deletes one wrong key after another", async ({ page, isMobile }) => {
  test.skip(isMobile, "a phone has no key to hold");
  await start(page, { customText: "بتن", requireBackspace: true });
  await typeKeys(page, ["ب", "س", "ش", "ص"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("سشص");
  await page.keyboard.down("Backspace");
  await page.keyboard.down("Backspace");
  await page.keyboard.down("Backspace");
  await page.keyboard.up("Backspace");
  await expect(surface(page).locator("[data-mistakes]")).toHaveCount(0);
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
  await typeKeys(page, ["ب", "5", "!"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("5!");
});

test("a mark typed by mistake with no letter to sit on is drawn on a tatweel, so it can be seen", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const mistakes = surface(page).locator("[data-mistakes]");
  await typeKeys(page, ["ب", FATHA]);
  await expect(mistakes).toHaveText(`ــ${FATHA}`);
  expect((await mistakes.boundingBox())?.width).toBeGreaterThan(3);
  await typeKeys(page, ["Backspace", " ", FATHA, "س", KASRA]);
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

test("while the text is not focused it is blurred and a button offers to activate it", async ({ page, isMobile }) => {
  test.skip(isMobile, "phones are told to tap");
  await open(page, { customText: "بتن" });
  await expect(activateButton(page)).toBeVisible();
  await expect(lessonText(page)).toHaveCSS("filter", /blur\(6px\)/);
  await startTyping(page);
  await expect(field(page)).toBeFocused();
  await expect(activateButton(page)).toHaveCount(0);
  await expect(lessonText(page)).toHaveCSS("filter", "none");
});

test("on a phone the button tells the learner to tap", async ({ page, isMobile }) => {
  test.skip(!isMobile, "only phones are told to tap");
  await open(page, { customText: "بتن" });
  await expect(activateButton(page, "Tap to activate…")).toBeVisible();
  await expect(lessonText(page)).toHaveCSS("filter", /blur\(6px\)/);
});

test("clicking the button, clicking the text and pressing Enter each activate the lesson", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "Enter needs a hardware keyboard");
  await open(page, { customText: "بتن" });
  await activateButton(page).click();
  await expect(field(page)).toBeFocused();
  await page.reload();
  await expect(surface(page)).toBeVisible();
  await lessonText(page).click({ position: { x: 12, y: 12 } });
  await expect(field(page)).toBeFocused();
  await page.reload();
  await expect(surface(page)).toBeVisible();
  await page.getByRole("heading", { level: 1 }).focus();
  await page.keyboard.press("Enter");
  await expect(field(page)).toBeFocused();
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe("ب");
});

test("Enter on a control is left to that control and does not activate the lesson", async ({ page, isMobile }) => {
  test.skip(isMobile, "Enter needs a hardware keyboard");
  await open(page, { customText: "بتن" });
  await page.getByRole("button", { name: "Settings" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect(field(page)).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeHidden();
  await expect(field(page)).not.toBeFocused();
});

test("leaving the field blurs the text again, and a finished lesson is never blurred", async ({ page }) => {
  await start(page, { customText: "بت" });
  await expect(lessonText(page)).toHaveCSS("filter", "none");
  await page.mouse.click(4, 4);
  await expect(field(page)).not.toBeFocused();
  await expect(lessonText(page)).toHaveCSS("filter", /blur\(6px\)/);
  await startTyping(page);
  await typeKeys(page, ["ب", "ت"]);
  await expect(finished(page)).toBeVisible();
  await expect(lessonText(page)).toHaveCSS("filter", "none");
});

async function countBlurs(page: Page): Promise<void> {
  await field(page).evaluate((element) => {
    element.dataset.blurs = "0";
    element.addEventListener("blur", () => {
      element.dataset.blurs = String(Number(element.dataset.blurs ?? "0") + 1);
    });
  });
}

test("clicking, double-clicking or dragging across the text never takes the focus away or selects it", async ({
  page,
  isMobile,
}) => {
  test.skip(isMobile, "a mouse is needed to drag");
  await start(page, { customText: "بتن كتب من بيت كل يوم" });
  await countBlurs(page);
  await lessonText(page).click({ position: { x: 40, y: 20 } });
  await lessonText(page).dblclick({ position: { x: 40, y: 20 } });
  await lessonText(page).click({ position: { x: 40, y: 20 }, clickCount: 3 });
  const box = await lessonText(page).boundingBox();
  await page.mouse.move((box?.x ?? 0) + 20, (box?.y ?? 0) + 30);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) - 20, (box?.y ?? 0) + 30, { steps: 6 });
  await page.mouse.up();
  await expect(field(page)).toHaveAttribute("data-blurs", "0");
  await expect(field(page)).toBeFocused();
  await expect(lessonText(page)).toHaveCSS("filter", "none");
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe("");
});

test("tapping the text while it is focused never takes the focus away", async ({ page, isMobile }) => {
  test.skip(!isMobile, "a touch screen is needed to tap");
  await start(page, { customText: "بتن كتب من بيت كل يوم" });
  await countBlurs(page);
  await lessonText(page).tap({ position: { x: 40, y: 20 } });
  await lessonText(page).tap({ position: { x: 60, y: 30 } });
  await expect(field(page)).toHaveAttribute("data-blurs", "0");
  await expect(field(page)).toBeFocused();
  await expect(lessonText(page)).toHaveCSS("filter", "none");
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

test("a passage a pixel or two taller than its window, from rounding, is not a scroll region", async ({ page }) => {
  await seedSettings(page, { language: "en" });
  await page.goto("/#/recitation/1");
  await expect(surface(page)).toBeVisible();
  await addStyle(page, "[data-lesson-text] p:last-of-type{margin-bottom:-1px}");
  await startTyping(page);
  await typeKeys(page, ["ب"]);
  const overflow = await lessonText(page).evaluate((element) => element.scrollHeight - element.clientHeight);
  expect(overflow).toBeGreaterThan(0);
  expect(overflow).toBeLessThanOrEqual(2);
  await expect(page.getByRole("group", { name: "Scrollable text" })).toHaveCount(0);
  await page.keyboard.press("Shift+Tab");
  await expect(lessonText(page)).not.toBeFocused();
});

test("the caret is only shown while the text is focused", async ({ page }) => {
  await open(page, { customText: "بتن" });
  const caret = surface(page).locator("[data-caret]");
  await expect(caret).toBeHidden();
  await startTyping(page);
  await expect(caret).toBeVisible();
  await page.mouse.click(4, 4);
  await expect(caret).toBeHidden();
});

test("the caret is a thin line", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await expect(surface(page).locator("[data-caret]")).toHaveCSS("width", "1.5px");
});

test("the caret is solid while typing and blinks with a fade once the typist pauses", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const caret = surface(page).locator("[data-caret]");
  await typeKeys(page, ["ب"]);
  await expect(caret).not.toHaveAttribute("data-idle", "");
  await expect(caret).toHaveCSS("animation-name", "none");
  await expect(caret).toHaveAttribute("data-idle", "");
  await expect(caret).toHaveCSS("animation-name", "caret-blink");
  await expect(caret).toHaveCSS("animation-duration", "1.1s");
  const opacityAt = (time: number) =>
    caret.evaluate((element, at) => {
      const blink = element
        .getAnimations()
        .find((candidate) => candidate instanceof CSSAnimation && candidate.animationName === "caret-blink");
      blink?.pause();
      if (blink !== undefined) {
        blink.currentTime = at;
      }
      return Number(getComputedStyle(element).opacity);
    }, time);
  expect(await opacityAt(100)).toBe(1);
  const fading = await opacityAt(495);
  expect(fading).toBeGreaterThan(0.05);
  expect(fading).toBeLessThan(0.95);
  expect(await opacityAt(700)).toBe(0);
  await typeKeys(page, ["ت"]);
  await expect(caret).not.toHaveAttribute("data-idle", "");
});

test("with reduced motion the caret never blinks", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await start(page, { customText: "بتن" });
  const caret = surface(page).locator("[data-caret]");
  await expect(caret).toHaveAttribute("data-idle", "");
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
  await expect(field(page)).toHaveAttribute("tabindex", "-1");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Type again" })).toBeFocused();
});

test("on a Mac the wrong-layout alert uses the Mac's name for the layout", async ({ page }) => {
  await emulatePlatform(page, "mac");
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["a"]);
  await expect(surface(page).getByRole("alert")).toHaveText(
    /^Your keyboard is not typing Arabic\. Switch to the \u2068Arabic – PC\u2069 layout\.$/,
  );
});

test("typing on a Latin layout is explained instead of being counted as mistakes", async ({ page }) => {
  await start(page, { customText: "بتن" });
  await typeKeys(page, ["a", "b"]);
  await expect(surface(page).getByRole("alert")).toHaveText(
    /^Your keyboard is not typing Arabic\. Switch to the \u2068Arabic \(101\)\u2069 layout\.$/,
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

test("a keyboard that builds each word as a composition types one key per letter", async ({ browserName, page }) => {
  test.skip(browserName !== "chromium", NEEDS_CDP);
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

test("a composition that ends before its last input event, as in Firefox, still types its letter once", async ({
  page,
}) => {
  await start(page, { customText: "بتن" });
  await field(page).evaluate((input: HTMLInputElement) => {
    const sentinel = "\u200B";
    input.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true }));
    input.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        inputType: "insertCompositionText",
        data: "ب",
        isComposing: true,
      }),
    );
    input.value = `${sentinel}ب`;
    input.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "ب" }));
    input.dispatchEvent(
      new InputEvent("input", { bubbles: true, inputType: "insertCompositionText", isComposing: false }),
    );
  });
  expect(await doneText(page)).toBe("ب");
  await typeKeys(page, ["ت", "ن"]);
  await expect(mistakeCount(page)).toHaveText("0");
  expect(await doneText(page)).toBe("بتن");
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

test("text still to be typed is a little brighter than text already typed, and both stay subtle", async ({ page }) => {
  await start(page, { customText: "بتن" });
  const untyped = await lessonText(page).evaluate((element) => getComputedStyle(element).color);
  expect(untyped).toBe("rgb(143, 146, 153)");
  await typeKeys(page, ["ب"]);
  const typed = await lessonText(page).evaluate(
    (element) => getComputedStyle(element, "::highlight(mafatih-done)").color,
  );
  expect(typed).toBe("rgb(91, 93, 97)");
});

test("typed letters are really drawn darker than the letters still to be typed, in every engine", async ({ page }) => {
  await start(page, { customText: "بتن كتب" });
  await typeKeys(page, ["ب", "ت", "ن"]);
  await addStyle(page, "[data-caret]{visibility:hidden}");
  const [typed, untyped] = await lessonText(page).evaluate((element) => {
    const node = element.querySelector("[data-block]")?.firstChild;
    if (node === null || node === undefined) {
      return [];
    }
    const middle = (from: number, to: number) => {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const box = range.getBoundingClientRect();
      return { x: box.x + box.width / 4, y: box.y + box.height * 0.3, width: box.width / 2, height: box.height * 0.4 };
    };
    return [middle(0, 3), middle(4, node.textContent?.length ?? 4)];
  });
  expect(typed).toBeDefined();
  expect(untyped).toBeDefined();
  const brightnessOf = async (clip: typeof typed) => brightestPixel(page, await page.screenshot({ clip }));
  await expect.poll(() => brightnessOf(typed), { timeout: 5000 }).toBeLessThan(120);
  expect(await brightnessOf(typed)).toBeGreaterThan(70);
  expect(await brightnessOf(untyped)).toBeGreaterThan(130);
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
  await typeKeys(page, ["ا", ..."ضضضضضضضضضضضض"]);
  await expect(surface(page).locator("[data-mistakes]")).toHaveText("ضضضضضضضضضض");
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
