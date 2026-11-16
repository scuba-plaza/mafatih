import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { emulatePlatform } from "./helpers/platform.ts";
import { savedSettings, seedSettings } from "./helpers/profile.ts";
import { startTyping, typeKeys } from "./helpers/typing.ts";

const FATHA = String.fromCodePoint(0x64e);

function guide(page: Page) {
  return page.locator("[data-guide-keyboard]");
}

async function dueKeys(page: Page): Promise<string[]> {
  const codes = await guide(page)
    .locator("[data-due]")
    .evaluateAll((keys) => keys.map((key) => key.getAttribute("data-key") ?? ""));
  return codes.sort();
}

async function start(page: Page, settings: Record<string, unknown>): Promise<void> {
  await seedSettings(page, settings);
  await page.goto("/#/custom");
  await startTyping(page);
}

function background(page: Page, code: string): Promise<string> {
  return guide(page)
    .locator(`[data-key="${code}"]`)
    .evaluate((key) => getComputedStyle(key).backgroundColor);
}

test.describe("with a wide screen and a mouse", () => {
  test.skip(({ isMobile }) => isMobile, "the guide teaches a physical keyboard");

  test("the guide points at the key for each next letter, the space bar and the lam-alef key", async ({ page }) => {
    await start(page, { customText: "بت لا" });
    await expect(guide(page)).toBeVisible();
    await expect(guide(page)).toHaveAttribute("aria-hidden", "true");
    await expect(guide(page)).toHaveAttribute("dir", "ltr");
    expect(await dueKeys(page)).toEqual(["KeyF"]);
    await typeKeys(page, ["ب"]);
    expect(await dueKeys(page)).toEqual(["KeyJ"]);
    await typeKeys(page, ["ت"]);
    expect(await dueKeys(page)).toEqual(["Space"]);
    await typeKeys(page, [" "]);
    expect(await dueKeys(page)).toEqual(["KeyB"]);
    await typeKeys(page, ["ل"]);
    expect(await dueKeys(page)).toEqual(["KeyH"]);
    await typeKeys(page, ["ا"]);
    expect(await dueKeys(page)).toEqual([]);
  });

  test("a mark needs Shift: its key shows the mark and the Shift key of the other hand is due too", async ({
    page,
  }) => {
    await start(page, { customText: `ب${FATHA}`, vocalization: "full" });
    await expect(guide(page).locator('[data-key="KeyQ"]')).toHaveText("ض");
    await typeKeys(page, ["ب"]);
    expect(await dueKeys(page)).toEqual(["KeyQ", "ShiftRight"]);
    await expect(guide(page).locator('[data-key="KeyQ"]')).toContainText(FATHA);
    await expect(guide(page).getByText(/Left little finger.*, with Shift/)).toBeVisible();
  });

  test("while mistakes wait to be deleted the guide points at Backspace alone", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await typeKeys(page, ["ب", "س"]);
    expect(await dueKeys(page)).toEqual(["Backspace"]);
    await typeKeys(page, ["Backspace"]);
    expect(await dueKeys(page)).toEqual(["KeyJ"]);
  });

  test("every key is drawn alike, and the caption names the finger for the next key", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await expect(guide(page).getByText("Left index finger")).toBeVisible();
    expect(await background(page, "KeyA")).toBe(await background(page, "KeyS"));
    expect(await background(page, "KeyS")).toBe(await background(page, "KeyL"));
    await expectNoAxeViolations(page);
  });

  test("while the text waits to be activated no key is lit and no finger is named", async ({ page }) => {
    await seedSettings(page, { customText: "بتن" });
    await page.goto("/#/custom");
    await expect(page.getByRole("button", { name: /to activate/ })).toBeVisible();
    await expect(guide(page)).toBeVisible();
    expect(await dueKeys(page)).toEqual([]);
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
    await startTyping(page);
    expect(await dueKeys(page)).toEqual(["KeyF"]);
    await expect(guide(page).getByText("Left index finger")).toBeVisible();
    await page.mouse.click(4, 4);
    await expect(page.getByRole("button", { name: /to activate/ })).toBeVisible();
    await expect.poll(() => dueKeys(page)).toEqual([]);
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
  });

  test("with the delay on, activating the text starts the wait again", async ({ page }) => {
    await seedSettings(page, { customText: "بتن", delayedHint: true });
    await page.goto("/#/custom");
    await expect(page.getByRole("button", { name: /to activate/ })).toBeVisible();
    await page.waitForTimeout(3500);
    await startTyping(page);
    expect(await dueKeys(page)).toEqual([]);
    await expect.poll(() => dueKeys(page), { timeout: 6000 }).toEqual(["KeyF"]);
  });

  test("the space bar names the layout the guide follows, in English and in Arabic", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await expect(guide(page).locator('[data-key="Space"]')).toHaveText("Arabic (101)");
  });

  test("the space bar names the layout in the Arabic interface too", async ({ page }) => {
    await seedSettings(page, { customText: "بتن", language: "ar" });
    await page.goto("/#/custom");
    await expect(guide(page).locator('[data-key="Space"]')).toHaveText("العربية (101)");
  });

  test("Settings says what the layout is called on this system", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await page.getByRole("button", { name: "Settings" }).click();
    const group = page.getByRole("dialog", { name: "Settings" }).getByRole("group", { name: "Keyboard guide" });
    await expect(group).toContainText(
      /Mafatih follows the standard Arabic PC layout\. In your system settings it is called \u2068Arabic \(101\)\u2069\./,
    );
  });

  test("on a Mac the space bar and Settings use the Mac's name for the layout", async ({ page }) => {
    await emulatePlatform(page, "mac");
    await start(page, { customText: "بتن" });
    await expect(guide(page).locator('[data-key="Space"]')).toHaveText("Arabic – PC");
    await page.getByRole("button", { name: "Settings" }).click();
    const group = page.getByRole("dialog", { name: "Settings" }).getByRole("group", { name: "Keyboard guide" });
    await expect(group).toContainText(/In your system settings it is called \u2068Arabic – PC\u2069\./);
  });

  test("on Windows the layout is called Arabic (101)", async ({ page }) => {
    await emulatePlatform(page, "windows");
    await start(page, { customText: "بتن" });
    await expect(guide(page).locator('[data-key="Space"]')).toHaveText("Arabic (101)");
  });

  test("with the letters off the keys are blank, except the lit key, the symbols and the layout name", async ({
    page,
  }) => {
    await start(page, { customText: "بتن", keyLabels: false });
    await expect(guide(page).locator('[data-key="KeyQ"]')).toHaveText("");
    await expect(guide(page).locator('[data-key="Digit1"]')).toHaveText("");
    await expect(guide(page).locator('[data-key="KeyF"]')).toHaveText("ب");
    await expect(guide(page).locator('[data-key="Backspace"]')).toHaveText("⌫");
    await expect(guide(page).locator('[data-key="ShiftLeft"]')).toHaveText("⇧");
    await expect(guide(page).locator('[data-key="Space"]')).toHaveText("Arabic (101)");
    await typeKeys(page, ["ب"]);
    await expect(guide(page).locator('[data-key="KeyF"]')).toHaveText("");
    await expect(guide(page).locator('[data-key="KeyJ"]')).toHaveText("ت");
  });

  test("with the delay on nothing is lit at first, and the key and the finger appear after three seconds", async ({
    page,
  }) => {
    await start(page, { customText: "بتن", delayedHint: true });
    expect(await dueKeys(page)).toEqual([]);
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
    await expect.poll(() => dueKeys(page), { timeout: 6000 }).toEqual(["KeyF"]);
    await expect(guide(page).getByText("Left index finger")).toBeVisible();
    await typeKeys(page, ["ب"]);
    await expect.poll(() => dueKeys(page)).toEqual([]);
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
  });

  test("a wrong key lights the next key at once, even with the delay on", async ({ page }) => {
    await start(page, { customText: "بتن", delayedHint: true });
    await typeKeys(page, ["ب", "س"]);
    await expect.poll(() => dueKeys(page)).toEqual(["Backspace"]);
    await typeKeys(page, ["Backspace"]);
    await expect.poll(() => dueKeys(page)).toEqual(["KeyJ"]);
  });

  test("the key labels and the delayed hint are switched in Settings and remembered", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await page.getByRole("button", { name: "Settings" }).click();
    const group = page.getByRole("dialog", { name: "Settings" }).getByRole("group", { name: "Keyboard guide" });
    await group.getByRole("switch", { name: "Show letters on the keys" }).uncheck();
    await expect(guide(page).locator('[data-key="KeyQ"]')).toHaveText("");
    await group.getByRole("switch", { name: "Show the next key after a pause" }).check();
    expect(await savedSettings(page)).toMatchObject({ keyLabels: false, delayedHint: true });
  });

  test("without the finger guide the caption goes and the keys do not change", async ({ page }) => {
    await start(page, { customText: "بتن", fingerGuide: false });
    await expect(guide(page)).toBeVisible();
    expect(await dueKeys(page)).toEqual(["KeyF"]);
    expect(await background(page, "KeyA")).toBe(await background(page, "KeyS"));
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
  });

  test("the keyboard and its finger guide are turned off and on in Settings", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await page.getByRole("button", { name: "Settings" }).click();
    const group = page.getByRole("dialog", { name: "Settings" }).getByRole("group", { name: "Keyboard guide" });
    await group.getByRole("switch", { name: "Show which finger to use" }).uncheck();
    await expect(guide(page).getByText("Left index finger")).toHaveCount(0);
    await group.getByRole("switch", { name: "Show the keyboard" }).uncheck();
    await expect(guide(page)).toHaveCount(0);
    await group.getByRole("switch", { name: "Show the keyboard" }).check();
    await expect(guide(page)).toHaveCount(1);
  });

  test("the guide never changes the height of the page while typing", async ({ page }) => {
    await start(page, { customText: `ب${FATHA}ت`, vocalization: "full" });
    const height = async () => (await guide(page).boundingBox())?.height;
    const before = await height();
    await typeKeys(page, ["ب"]);
    expect(await height()).toBe(before);
    await typeKeys(page, ["س"]);
    expect(await height()).toBe(before);
  });

  test("the keys sit where a real keyboard has them, and every row is as wide as the Backspace row ends", async ({
    page,
  }) => {
    await start(page, { customText: "بتن" });
    const box = async (code: string) => {
      const found = await guide(page).locator(`[data-key="${code}"]`).boundingBox();
      if (found === null) {
        throw new Error(`no key ${code}`);
      }
      return found;
    };
    const right = async (code: string) => {
      const found = await box(code);
      return Math.round(found.x + found.width);
    };
    const edge = await right("Backspace");
    expect((await box("Backslash")).y).toBe((await box("BracketRight")).y);
    expect((await box("Enter")).y).toBe((await box("Quote")).y);
    for (const code of ["Backslash", "Enter", "ShiftRight"]) {
      expect(await right(code), code).toBe(edge);
    }
    expect((await box("KeyQ")).x).toBeGreaterThan((await box("Backquote")).x);
    expect((await box("KeyA")).x).toBeGreaterThan((await box("KeyQ")).x);
  });

  test("a due key is drawn bold and with a glow, not by colour alone", async ({ page }) => {
    await start(page, { customText: "بت" });
    const look = (code: string) =>
      guide(page)
        .locator(`[data-key="${code}"]`)
        .evaluate((key) => {
          const style = getComputedStyle(key);
          return { weight: style.fontWeight, glow: style.boxShadow };
        });
    const due = await look("KeyF");
    const plain = await look("KeyJ");
    expect(due.weight).toBe("700");
    expect(plain.weight).toBe("400");
    expect(due.glow).not.toBe("none");
    expect(plain.glow).toBe("none");
  });

  for (const [width, height, gap] of [
    [1366, 768, 38],
    [1920, 1080, 54],
  ] as const) {
    test(`the keyboard sits clear of the text at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await seedSettings(page, {});
      await page.goto("/#/recitation/1");
      await startTyping(page);
      const distance = await page.evaluate(() => {
        const keyboard = document.querySelector("[data-guide-keyboard]");
        const lesson = document.querySelector("[data-lesson-text]");
        return keyboard === null || lesson === null
          ? Number.NaN
          : keyboard.getBoundingClientRect().top - lesson.getBoundingClientRect().bottom;
      });
      expect(distance).toBeGreaterThanOrEqual(32);
      expect(Math.abs(distance - gap)).toBeLessThanOrEqual(1);
    });
  }

  test("the finger hint sits 12 px under the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await start(page, { customText: "بت" });
    const space = await guide(page).evaluate((keyboard) => {
      const rows = keyboard.children;
      const lastRow = rows[rows.length - 2]?.getBoundingClientRect();
      const hint = rows[rows.length - 1]?.getBoundingClientRect();
      return lastRow === undefined || hint === undefined ? Number.NaN : hint.top - lastRow.bottom;
    });
    expect(Math.abs(space - 12)).toBeLessThanOrEqual(1);
  });

  test("below the medium width there is no guide", async ({ page }) => {
    await page.setViewportSize({ width: 700, height: 800 });
    await start(page, { customText: "بتن" });
    await expect(guide(page)).toBeHidden();
  });

  test("at the medium width the whole keyboard fits without sideways scrolling", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await start(page, { customText: "بتن" });
    await expect(guide(page)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    const box = await guide(page).boundingBox();
    expect(box?.x).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(768);
  });
});

test.describe("on a phone", () => {
  test.skip(({ isMobile }) => !isMobile, "phones use their own keyboard");

  test("there is no guide, and Settings does not offer one", async ({ page }) => {
    await start(page, { customText: "بتن" });
    await expect(guide(page)).toBeHidden();
    await page.keyboard.press("Tab");
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog.getByRole("group", { name: "Vocalization" })).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Keyboard guide" })).toHaveCount(0);
  });
});

test.describe("on a wide touch screen", () => {
  test.use({ viewport: { width: 1024, height: 768 }, hasTouch: true, isMobile: true });

  test("there is no guide, and Settings does not offer one", async ({ page }) => {
    await start(page, { customText: "بتن" });
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await expect(guide(page)).toBeHidden();
    await page.getByRole("button", { name: "Settings" }).click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await expect(dialog.getByRole("group", { name: "Vocalization" })).toBeVisible();
    await expect(dialog.getByRole("group", { name: "Keyboard guide" })).toHaveCount(0);
  });
});
