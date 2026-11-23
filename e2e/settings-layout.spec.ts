import { expect, type Locator, test } from "@playwright/test";
import { openSettingsGroup, type SettingsGroup } from "./helpers/pages.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle, WIDE_LARGE_TEXT } from "./helpers/style.ts";

const GROUPS: readonly SettingsGroup[] = ["General", "Lesson", "Recitation", "Your data"];

interface Control {
  readonly group: SettingsGroup;
  readonly name: string;
  readonly guide?: true;
  readonly find: (pane: Locator) => Locator;
}

const CONTROLS: readonly Control[] = [
  { group: "General", name: "Language", find: (pane) => pane.getByRole("group", { name: "Language" }) },
  { group: "General", name: "About", find: (pane) => pane.getByRole("link", { name: "About" }) },
  { group: "Lesson", name: "Vocalization", find: (pane) => pane.getByRole("group", { name: "Vocalization" }) },
  {
    group: "Lesson",
    name: "Correct mistakes with Backspace",
    find: (pane) => pane.getByRole("switch", { name: "Correct mistakes with Backspace" }),
  },
  { group: "Lesson", name: "Lesson font", find: (pane) => pane.getByRole("group", { name: "Lesson font" }) },
  { group: "Lesson", name: "Lesson text size", find: (pane) => pane.getByRole("slider", { name: "Lesson text size" }) },
  {
    group: "Lesson",
    name: "Show the keyboard",
    guide: true,
    find: (pane) => pane.getByRole("switch", { name: "Show the keyboard" }),
  },
  {
    group: "Lesson",
    name: "Show which finger to use",
    guide: true,
    find: (pane) => pane.getByRole("switch", { name: "Show which finger to use" }),
  },
  {
    group: "Lesson",
    name: "Show letters on the keys",
    guide: true,
    find: (pane) => pane.getByRole("switch", { name: "Show letters on the keys" }),
  },
  {
    group: "Lesson",
    name: "Show the next key after a pause",
    guide: true,
    find: (pane) => pane.getByRole("switch", { name: "Show the next key after a pause" }),
  },
  {
    group: "Recitation",
    name: "Ayat per passage",
    find: (pane) => pane.getByRole("combobox", { name: "Ayat per passage" }),
  },
  { group: "Recitation", name: "Surah order", find: (pane) => pane.getByRole("group", { name: "Surah order" }) },
  { group: "Recitation", name: "Reciter", find: (pane) => pane.getByRole("group", { name: "Reciter" }) },
  {
    group: "Recitation",
    name: "Delete saved recitations",
    find: (pane) => pane.getByRole("button", { name: "Delete saved recitations" }),
  },
  {
    group: "Your data",
    name: "Download backup",
    find: (pane) => pane.getByRole("button", { name: "Download backup" }),
  },
  {
    group: "Your data",
    name: "Restore from a backup file",
    find: (pane) => pane.getByText("Restore from a backup file"),
  },
  { group: "Your data", name: "Reset progress", find: (pane) => pane.getByRole("button", { name: "Reset progress" }) },
  {
    group: "Your data",
    name: "Unlock all letters",
    find: (pane) => pane.getByRole("button", { name: "Unlock all letters" }),
  },
];

function dialogOf(page: import("@playwright/test").Page): Locator {
  return page.getByRole("dialog", { name: "Settings" });
}

function groupNav(page: import("@playwright/test").Page): Locator {
  return page.getByRole("dialog").getByRole("navigation");
}

async function openFresh(page: import("@playwright/test").Page, name = "Settings"): Promise<void> {
  await page.goto("/#/custom");
  await page.getByRole("button", { name }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
}

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Settings opens on a list of four groups, each with a one-line summary", async ({ page }) => {
    await openFresh(page);
    const rows = groupNav(page).getByRole("button");
    await expect(rows).toHaveText([/^General/, /^Lesson/, /^Recitation/, /^Your data/]);
    const summaries = groupNav(page).locator("[data-summary]");
    const isolates = /[\u2066-\u2069]/g;
    expect((await summaries.allTextContents()).map((text) => text.replace(isolates, ""))).toEqual([
      "English",
      "Scheherazade New · 40",
      "Murattal · 4 ayat",
      "Backup, restore, reset",
    ]);
    for (const lines of await summaries.evaluateAll((all) =>
      all.map(
        (element) => element.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(element).lineHeight),
      ),
    )) {
      expect(lines).toBeLessThan(1.6);
    }
  });

  test("the summaries stay on one line at 320 pixels with text at 200 percent", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/#/custom");
    await addStyle(page, WIDE_LARGE_TEXT);
    await page.getByRole("button", { name: "Settings" }).click();
    const summaries = groupNav(page).locator("[data-summary]");
    await expect(summaries).toHaveCount(4);
    for (const lines of await summaries.evaluateAll((all) =>
      all.map(
        (element) => element.getBoundingClientRect().height / Number.parseFloat(getComputedStyle(element).lineHeight),
      ),
    )) {
      expect(lines).toBeLessThan(1.6);
    }
  });

  for (const language of ["en", "ar"] as const) {
    test(`the title is centred in the dialog, in the list and in every group (${language})`, async ({ page }) => {
      await seedSettings(page, { language });
      await openFresh(page, language === "en" ? "Settings" : "الإعدادات");
      const dialog = page.getByRole("dialog");
      const centred = async (): Promise<void> => {
        const heading = await dialog.getByRole("heading", { level: 2 }).boundingBox();
        const frame = await dialog.boundingBox();
        expect(heading).not.toBeNull();
        expect(frame).not.toBeNull();
        const gap = (heading?.x ?? 0) + (heading?.width ?? 0) / 2 - ((frame?.x ?? 0) + (frame?.width ?? 0) / 2);
        expect(Math.abs(gap)).toBeLessThanOrEqual(1);
      };
      await centred();
      for (let index = 0; index < GROUPS.length; index += 1) {
        await groupNav(page).getByRole("button").nth(index).click();
        await centred();
        await dialog
          .getByRole("button", { name: language === "en" ? "Back to Settings" : "العودة إلى الإعدادات" })
          .click();
      }
    });
  }
});

for (const wide of [false, true]) {
  test(`every control is in exactly one group (${wide ? "wide" : "phone"})`, async ({ page, hasTouch }) => {
    await page.setViewportSize(wide ? { width: 1280, height: 900 } : { width: 390, height: 844 });
    await openFresh(page);
    const guideExists = wide && !hasTouch;
    for (const group of GROUPS) {
      const pane = await openSettingsGroup(page, group);
      for (const control of CONTROLS) {
        const found = control.find(pane);
        if (control.group === group && (control.guide !== true || guideExists)) {
          await expect(found, `${control.name} is in ${group}`).toBeVisible();
        } else {
          await expect(found, `${control.name} is not in ${group}`).toHaveCount(0);
        }
      }
    }
  });
}

test("any group is one action away from a freshly opened Settings", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page);
  await groupNav(page)
    .getByRole("button", { name: /^Your data/ })
    .click();
  await expect(dialogOf(page).getByRole("button", { name: "Reset progress" })).toBeVisible();
});

test("Settings always opens on the first group, wide or narrow", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFresh(page);
  await expect(dialogOf(page).getByRole("region", { name: "General", exact: true })).toBeVisible();
  await openSettingsGroup(page, "Recitation");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(dialogOf(page).getByRole("region", { name: "General", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(groupNav(page).getByRole("button")).toHaveCount(4);
  await expect(dialogOf(page).getByRole("region")).toHaveCount(0);
});

test("the tallest group fits the scroll budget", async ({ page }) => {
  test.fixme(true, "enabled in the Recitation and Your data task, once every group is compact");
  for (const [size, limit] of [
    [{ width: 390, height: 844 }, 1.5],
    [{ width: 1440, height: 900 }, 1],
  ] as const) {
    await page.setViewportSize(size);
    await openFresh(page);
    for (const group of GROUPS) {
      await openSettingsGroup(page, group);
      const ratio = await dialogOf(page)
        .locator("[data-settings-scroll]")
        .evaluate((element) => element.scrollHeight / element.clientHeight);
      expect(ratio, `${group} at ${size.width}`).toBeLessThanOrEqual(limit);
    }
  }
});
