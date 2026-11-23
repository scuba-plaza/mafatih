import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { openSettingsGroup, type SettingsGroup } from "./helpers/pages.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle, WIDE_LARGE_TEXT } from "./helpers/style.ts";

const GROUPS: readonly SettingsGroup[] = ["General", "Lesson", "Recitation", "Your data"];
const ARABIC = {
  open: "الإعدادات",
  back: "العودة إلى الإعدادات",
  rows: ["عام", "الدرس", "التلاوة", "بياناتك"],
} as const;

function dialogOf(page: Page): Locator {
  return page.getByRole("dialog");
}

async function openIn(page: Page, language: "en" | "ar", hash = "#/custom"): Promise<void> {
  await seedSettings(page, { language });
  await page.goto(`/${hash}`);
  await page.getByRole("button", { name: language === "en" ? "Settings" : ARABIC.open }).click();
  await expect(dialogOf(page)).toBeVisible();
}

async function box(locator: Locator): Promise<{ x: number; y: number; width: number; height: number }> {
  const found = await locator.boundingBox();
  expect(found).not.toBeNull();
  return found ?? { x: 0, y: 0, width: 0, height: 0 };
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const group of GROUPS) {
    test(`Escape, Done and a click outside close Settings from ${group} and give focus back to the Settings button`, async ({
      page,
    }) => {
      await page.goto("/#/custom");
      const opener = page.getByRole("button", { name: "Settings" });
      await openSettingsGroup(page, group);
      await page.keyboard.press("Escape");
      await expect(dialogOf(page)).toBeHidden();
      await expect(opener).toBeFocused();
      await openSettingsGroup(page, group);
      await dialogOf(page).getByRole("button", { name: "Done" }).click();
      await expect(dialogOf(page)).toBeHidden();
      await expect(opener).toBeFocused();
      await openSettingsGroup(page, group);
      await page.mouse.click(195, 10);
      await expect(dialogOf(page)).toBeHidden();
      await expect(opener).toBeFocused();
    });
  }

  test("choosing a group moves focus to its title, and going back returns focus to that group's row", async ({
    page,
  }) => {
    await page.goto("/#/custom");
    await page.getByRole("button", { name: "Settings" }).click();
    const row = dialogOf(page)
      .getByRole("navigation")
      .getByRole("button", { name: /^Recitation/ });
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(dialogOf(page).getByRole("heading", { level: 2, name: "Recitation" })).toBeFocused();
    await dialogOf(page).getByRole("button", { name: "Back to Settings" }).click();
    await expect(
      dialogOf(page)
        .getByRole("navigation")
        .getByRole("button", { name: /^Recitation/ }),
    ).toBeFocused();
  });

  test("the Tab walk through the list reaches every row and Done, and stays inside the dialog", async ({ page }) => {
    await page.goto("/#/custom");
    await page.getByRole("button", { name: "Settings" }).click();
    const names: string[] = [];
    const current = () =>
      page.evaluate(() => {
        const active = document.activeElement;
        return `${active?.closest("dialog") === null ? "outside" : "inside"}:${active?.textContent?.trim().split(/\s/)[0] ?? ""}`;
      });
    names.push(await current());
    for (let step = 0; step < 4; step += 1) {
      await page.keyboard.press("Tab");
      names.push(await current());
    }
    expect(names.every((name) => name.startsWith("inside:"))).toBe(true);
    expect(names.some((name) => name === "inside:Done")).toBe(true);
    for (const row of ["General", "Lesson", "Recitation", "Your"]) {
      expect(names.some((name) => name.startsWith(`inside:${row}`))).toBe(true);
    }
  });
});

test.describe("on a wide screen", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("the rail marks the chosen group and keeps focus on it", async ({ page }) => {
    await page.goto("/#/custom");
    await page.getByRole("button", { name: "Settings" }).click();
    const nav = dialogOf(page).getByRole("navigation");
    await expect(nav.getByRole("button", { name: /^General/ })).toHaveAttribute("aria-current", "true");
    const lesson = nav.getByRole("button", { name: /^Lesson/ });
    await lesson.focus();
    await page.keyboard.press("Enter");
    await expect(lesson).toHaveAttribute("aria-current", "true");
    await expect(nav.getByRole("button", { name: /^General/ })).not.toHaveAttribute("aria-current", "true");
    await expect(lesson).toBeFocused();
  });

  for (const language of ["en", "ar"] as const) {
    test(`in ${language} the rail starts the row and Done ends it`, async ({ page }) => {
      await openIn(page, language);
      const frame = await box(dialogOf(page));
      const rail = await box(dialogOf(page).getByRole("navigation"));
      const done = await box(dialogOf(page).getByRole("button", { name: language === "en" ? "Done" : "تم" }));
      const middle = frame.x + frame.width / 2;
      if (language === "en") {
        expect(rail.x + rail.width / 2).toBeLessThan(middle);
        expect(done.x + done.width / 2).toBeGreaterThan(middle);
      } else {
        expect(rail.x + rail.width / 2).toBeGreaterThan(middle);
        expect(done.x + done.width / 2).toBeLessThan(middle);
      }
    });
  }

  for (const language of ["en", "ar"] as const) {
    test(`with a fine pointer the preview column is on the end side (${language})`, async ({ page, hasTouch }) => {
      test.skip(hasTouch, "needs a fine pointer");
      await openIn(page, language);
      await dialogOf(page)
        .getByRole("navigation")
        .getByRole("button", { name: language === "en" ? /^Lesson/ : /^الدرس/ })
        .click();
      const frame = await box(dialogOf(page));
      const preview = await box(page.locator("[data-preview]"));
      const middle = frame.x + frame.width / 2;
      expect(language === "en" ? preview.x > middle : preview.x + preview.width < middle).toBe(true);
    });
  }
});

test.describe("on a phone in Arabic", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the back arrow is on the end side and Done on the start side", async ({ page }) => {
    await openIn(page, "ar");
    await dialogOf(page).getByRole("navigation").getByRole("button").first().click();
    const frame = await box(dialogOf(page));
    const back = await box(dialogOf(page).getByRole("button", { name: ARABIC.back }));
    const done = await box(dialogOf(page).getByRole("button", { name: "تم" }));
    const middle = frame.x + frame.width / 2;
    expect(back.x + back.width / 2).toBeGreaterThan(middle);
    expect(done.x + done.width / 2).toBeLessThan(middle);
  });
});

test.describe("at 320 pixels with text at 200 percent", () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test("nothing is clipped, Done is reachable, back keeps its name, and the preview scrolls with the controls", async ({
    page,
  }) => {
    await page.goto("/#/custom");
    await addStyle(page, WIDE_LARGE_TEXT);
    await page.getByRole("button", { name: "Settings" }).click();
    for (const group of GROUPS) {
      await openSettingsGroup(page, group);
      const frame = dialogOf(page);
      expect(await frame.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
      await expect(frame.getByRole("button", { name: "Done" })).toBeInViewport({ ratio: 1 });
      const back = frame.getByRole("button", { name: "Back to Settings" });
      await expect(back).toBeVisible();
      expect((await box(back)).width).toBeLessThan(80);
      const pane = frame.locator("[data-settings-scroll]");
      expect(await pane.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
    }
    await openSettingsGroup(page, "Lesson");
    const before = (await box(page.locator("[data-preview]"))).y;
    await dialogOf(page)
      .locator("[data-settings-scroll]")
      .evaluate((element) => element.scrollTo(0, 200));
    expect((await box(page.locator("[data-preview]"))).y).toBeLessThan(before);
  });
});

test("at the largest lesson text size the preview and the font choices stay inside their boxes", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedSettings(page, { fontSize: 72 });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Settings" }).click();
  const pane = await openSettingsGroup(page, "Lesson");
  const preview = page.locator("[data-preview]");
  expect(await preview.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  const fonts = pane.getByRole("group", { name: "Lesson font" });
  expect(await fonts.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(0);
  const frame = await box(dialogOf(page));
  for (const label of await fonts.locator("label").all()) {
    const found = await box(label);
    expect(found.x).toBeGreaterThanOrEqual(frame.x);
    expect(found.x + found.width).toBeLessThanOrEqual(frame.x + frame.width);
  }
});

test("on a landscape phone with a display cutout the list, the header and the pane stay out of the cutout", async ({
  browserName,
  page,
}) => {
  test.skip(browserName !== "chromium", "needs the Chrome DevTools Protocol");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setSafeAreaInsetsOverride", { insets: { left: 44, right: 44 } });
  await page.setViewportSize({ width: 667, height: 375 });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Settings" }).click();
  const row = await box(dialogOf(page).getByRole("navigation").getByRole("button").first());
  expect(row.x).toBeGreaterThanOrEqual(44);
  expect(row.x + row.width).toBeLessThanOrEqual(667 - 44);
  await openSettingsGroup(page, "Recitation");
  const radio = await box(dialogOf(page).getByRole("group", { name: "Ayat per passage" }).locator("label").first());
  expect(radio.x).toBeGreaterThanOrEqual(44);
  const done = await box(dialogOf(page).getByRole("button", { name: "Done" }));
  expect(done.x + done.width).toBeLessThanOrEqual(667 - 44);
});

test("with forced colours the chosen group, segment and font choice are distinguishable", async ({ page }) => {
  await page.emulateMedia({ forcedColors: "active" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Settings" }).click();
  const colours = (locator: Locator) =>
    locator.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.backgroundColor}|${style.color}|${style.borderColor}`;
    });
  const nav = dialogOf(page).getByRole("navigation");
  expect(await colours(nav.getByRole("button", { name: /^General/ }))).not.toBe(
    await colours(nav.getByRole("button", { name: /^Lesson/ })),
  );
  await nav.getByRole("button", { name: /^Lesson/ }).click();
  const span = (name: string) =>
    dialogOf(page).getByRole("radio", { name, exact: true }).locator("xpath=following-sibling::span[1]");
  expect(await colours(span("Auto"))).not.toBe(await colours(span("Full")));
  expect(await colours(span("Scheherazade New"))).not.toBe(await colours(span("Amiri")));
});

test("with reduced motion nothing in Settings moves when the group changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Settings" }).click();
  for (const group of GROUPS) {
    await openSettingsGroup(page, group);
    const moving = await page.evaluate(() =>
      document.getAnimations().flatMap((animation) => {
        const effect = animation.effect;
        const keyframes = effect instanceof KeyframeEffect ? effect.getKeyframes() : [];
        return keyframes
          .flatMap((frame) => Object.keys(frame))
          .filter((property) =>
            ["transform", "translate", "opacity", "top", "left", "width", "height"].includes(property),
          );
      }),
    );
    expect(moving, group).toEqual([]);
  }
});

for (const language of ["en", "ar"] as const) {
  for (const [name, viewport] of [
    ["phone", { width: 390, height: 844 }],
    ["desktop", { width: 1280, height: 900 }],
  ] as const) {
    test(`axe finds no violations in the list or any group (${name}, ${language})`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await openIn(page, language);
      await expectNoAxeViolations(page);
      const nav = dialogOf(page).getByRole("navigation");
      for (let index = 0; index < ARABIC.rows.length; index += 1) {
        await nav.getByRole("button").nth(index).click();
        await expectNoAxeViolations(page);
        const back = dialogOf(page).getByRole("button", { name: language === "en" ? "Back to Settings" : ARABIC.back });
        if (name === "phone") {
          await back.click();
        }
      }
    });
  }
}
