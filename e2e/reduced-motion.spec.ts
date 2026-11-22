import { expect, type Page, test } from "@playwright/test";
import { openAndWait, PAGES, seedTypicalProfile } from "./helpers/pages.ts";
import { seedProfile } from "./helpers/profile.ts";
import { lettersOf, surah } from "./helpers/quran.ts";
import { startTyping, surface, typeKeys } from "./helpers/typing.ts";
import { afterFrames } from "./helpers/waits.ts";

const MOVES =
  /^(transform|translate|rotate|scale|opacity|offset.*|top|left|right|bottom|inset.*|margin.*|width|height|filter)$/;
const IDLE_MS = 450;

async function moving(page: Page): Promise<string[]> {
  return page.evaluate((pattern) => {
    const moves = new RegExp(pattern);
    return document.getAnimations().flatMap((animation) => {
      const effect = animation.effect;
      const properties =
        effect instanceof KeyframeEffect
          ? [...new Set(effect.getKeyframes().flatMap((keyframe) => Object.keys(keyframe)))].filter((key) =>
              moves.test(key),
            )
          : [];
      if (properties.length === 0) {
        return [];
      }
      const name =
        animation instanceof CSSAnimation
          ? animation.animationName
          : animation instanceof CSSTransition
            ? `transition ${animation.transitionProperty}`
            : animation.id;
      return [`${name}: ${properties.join(", ")}`];
    });
  }, MOVES.source);
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
}

async function finishKawthar(page: Page): Promise<void> {
  await seedProfile(page, { settings: { vocalization: "letters" } });
  await page.goto("/#/recitation/108");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  await typeKeys(page, lettersOf(surah(108), 1, 3, true));
  await expect(page.getByRole("dialog", { name: /complete$/ })).toBeVisible();
}

async function waitIdle(page: Page): Promise<void> {
  await page.evaluate((ms) => new Promise((resolve) => setTimeout(resolve, ms)), IDLE_MS);
  await afterFrames(page, 3);
}

test.describe("with Reduce Motion on, nothing on any page or in any dialog moves", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const target of PAGES) {
    test(`the ${target.name} page, once settled and while its text waits for a key`, async ({ page }) => {
      await seedTypicalProfile(page, "en");
      await openAndWait(page, target.hash, target.typing);
      await waitIdle(page);
      expect(await moving(page)).toEqual([]);
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    });
  }

  test("the Settings dialog, its switches and its radio buttons, also when one is changed", async ({ page }) => {
    await seedTypicalProfile(page, "en");
    await openAndWait(page, "#/custom", true);
    await openSettings(page);
    const dialog = page.getByRole("dialog", { name: "Settings" });
    for (const toggle of await dialog.getByRole("switch").all()) {
      await toggle.click();
      expect(await moving(page)).toEqual([]);
      const property = await toggle.evaluate((element) => getComputedStyle(element, "::before").transitionProperty);
      expect(property, "the knob of a switch moves at once").toBe("none");
    }
    await waitIdle(page);
    expect(await moving(page)).toEqual([]);
  });

  test("a wrong key, the idle caret and the audio controls", async ({ page }) => {
    await seedProfile(page, { settings: { vocalization: "letters" } });
    await page.goto("/#/recitation/1/1");
    await startTyping(page);
    await typeKeys(page, ["x"]);
    expect(await moving(page)).toEqual([]);
    await waitIdle(page);
    expect(await moving(page)).toEqual([]);
    const caret = page.locator("[data-caret]");
    expect(await caret.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  });

  test("the surah-complete card, its rays, its name and its star", async ({ page }) => {
    await finishKawthar(page);
    await waitIdle(page);
    expect(await moving(page)).toEqual([]);
  });
});

test.describe("the check can see motion, so a clean result means something", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" });
  });

  test("the idle caret blinks, a switch slides and the surah-complete card moves when nothing is asked to be calm", async ({
    page,
  }) => {
    await seedProfile(page, { settings: { vocalization: "letters" } });
    await page.goto("/#/recitation/1/1");
    await startTyping(page);
    await waitIdle(page);
    expect((await moving(page)).join(" | ")).toContain("caret-blink");
    await seedProfile(page, { settings: { vocalization: "letters" } });
    await page.goto("/#/custom");
    await openSettings(page);
    const knob = page.getByRole("dialog", { name: "Settings" }).getByRole("switch").first();
    expect(await knob.evaluate((element) => getComputedStyle(element, "::before").transitionProperty)).toContain(
      "translate",
    );
    await page.keyboard.press("Escape");
    await finishKawthar(page);
    await afterFrames(page, 3);
    const names = (await moving(page)).join(" | ");
    for (const name of ["burst", "rise", "glow", "pulse", "starpop"]) {
      expect(names, name).toContain(name);
    }
  });
});
