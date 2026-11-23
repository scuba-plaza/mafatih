import { expect, type Locator, test } from "@playwright/test";
import { openSettingsGroup, type SettingsGroup } from "./helpers/pages.ts";
import { seedSettings } from "./helpers/profile.ts";
import { addStyle, WIDE_LARGE_TEXT } from "./helpers/style.ts";

const GROUPS: readonly SettingsGroup[] = ["General", "Lesson", "Recitation"];

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
    find: (pane) => pane.getByRole("group", { name: "Ayat per passage" }),
  },
  { group: "Recitation", name: "Surah order", find: (pane) => pane.getByRole("group", { name: "Surah order" }) },
  { group: "Recitation", name: "Reciter", find: (pane) => pane.getByRole("group", { name: "Reciter" }) },
  {
    group: "Recitation",
    name: "Delete saved recitations",
    find: (pane) => pane.getByRole("button", { name: "Delete saved recitations" }),
  },
  {
    group: "General",
    name: "Download backup",
    find: (pane) => pane.getByRole("button", { name: "Download backup" }),
  },
  {
    group: "General",
    name: "Restore from a backup file",
    find: (pane) => pane.getByText("Restore from a backup file"),
  },
  { group: "General", name: "Reset progress", find: (pane) => pane.getByRole("button", { name: "Reset progress" }) },
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

  test("Settings opens on a list of three groups, each with a one-line summary", async ({ page }) => {
    await openFresh(page);
    const rows = groupNav(page).getByRole("button");
    await expect(rows).toHaveText([/^General/, /^Lesson/, /^Recitation/]);
    const summaries = groupNav(page).locator("[data-summary]");
    const isolates = /[\u2066-\u2069]/g;
    expect((await summaries.allTextContents()).map((text) => text.replace(isolates, ""))).toEqual([
      "English",
      "Scheherazade New · 40",
      "Murattal · 4 ayat",
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
    await expect(summaries).toHaveCount(3);
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
    .getByRole("button", { name: /^Recitation/ })
    .click();
  await expect(dialogOf(page).getByRole("group", { name: "Reciter" })).toBeVisible();
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
  await expect(groupNav(page).getByRole("button")).toHaveCount(3);
  await expect(dialogOf(page).getByRole("region")).toHaveCount(0);
});

test("the tallest group fits the scroll budget", async ({ page, hasTouch }) => {
  for (const [size, limit] of [
    [{ width: 390, height: 844 }, 1.5],
    [{ width: 1440, height: 900 }, 1],
  ] as const) {
    if (hasTouch && size.width > 800) {
      continue;
    }
    await page.setViewportSize(size);
    await openFresh(page);
    for (const group of GROUPS) {
      await openSettingsGroup(page, group);
      const ratio = await dialogOf(page)
        .locator("[data-settings-scroll]")
        .evaluate((element) => element.scrollHeight / element.clientHeight);
      expect(ratio, `${group} at ${size.width}`).toBeLessThanOrEqual(limit);
    }
    await page.keyboard.press("Escape");
  }
});

test("the three font choices sit in one row on a phone, each showing its sample", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page);
  const pane = await openSettingsGroup(page, "Lesson");
  const radios = pane.getByRole("group", { name: "Lesson font" }).getByRole("radio");
  await expect(radios).toHaveCount(3);
  const labels = pane.getByRole("group", { name: "Lesson font" }).locator("label");
  const tops: number[] = [];
  for (let index = 0; index < 3; index += 1) {
    const box = await labels.nth(index).boundingBox();
    tops.push(Math.round(box?.y ?? Number.NaN));
  }
  expect(new Set(tops).size).toBe(1);
  await expect(pane.getByRole("group", { name: "Lesson font" }).locator("[data-font-sample]")).toHaveCount(3);
});

test("Lesson holds the lesson-display controls and nothing else", async ({ page, hasTouch }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await openFresh(page);
  const pane = await openSettingsGroup(page, "Lesson");
  const guide = !hasTouch;
  await expect(pane.getByRole("radio")).toHaveCount(7);
  await expect(pane.getByRole("slider")).toHaveCount(1);
  await expect(pane.getByRole("switch")).toHaveCount(guide ? 5 : 1);
  await expect(pane.getByRole("button")).toHaveCount(0);
  await expect(pane.getByRole("link")).toHaveCount(0);
  await expect(pane.getByRole("combobox")).toHaveCount(0);
});

test("Ayat per passage is four radios named 1 to 4, and the choice is saved", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page);
  const pane = await openSettingsGroup(page, "Recitation");
  const group = pane.getByRole("group", { name: "Ayat per passage" });
  await expect(group.locator("label")).toHaveText(["1", "2", "3", "4"]);
  await expect(group.getByRole("radio", { name: "4", exact: true })).toBeChecked();
  await group.getByRole("radio", { name: "2", exact: true }).check();
  await expect(pane.getByRole("navigation")).toHaveCount(0);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("mafatih:profile:2") ?? "{}").settings.ayatPerLesson,
  );
  expect(saved).toBe(2);
});

test("Surah order and Reciter show the hint of the chosen option and keep every hint announced", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page);
  const pane = await openSettingsGroup(page, "Recitation");
  const order = pane.getByRole("group", { name: "Surah order" });
  await expect(order.getByText("From Al-Faatiha to An-Naas.")).toBeVisible();
  await expect(order.getByRole("radio", { name: "Juz ʿAmma first" })).toHaveAccessibleDescription(
    "The short surahs from An-Naas back to An-Naba, then Al-Faatiha onwards.",
  );
  await order.getByRole("radio", { name: "Juz ʿAmma first" }).check();
  await expect(
    order.getByText("The short surahs from An-Naas back to An-Naba, then Al-Faatiha onwards."),
  ).toBeVisible();
  const reciter = pane.getByRole("group", { name: "Reciter" });
  await expect(reciter.getByText("Measured and paced for learning.")).toBeVisible();
  await expect(reciter.getByRole("radio", { name: "Mujawwad", exact: true })).toHaveAccessibleDescription(
    "Melodic and ornamented.",
  );
});

test("General explains what Reset progress does before the button", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openFresh(page);
  const pane = await openSettingsGroup(page, "General");
  const explanation = pane.getByText(/This clears your unlocked keys, your key statistics and your lesson history/);
  await expect(explanation).toBeVisible();
  const above = (await explanation.boundingBox())?.y ?? 0;
  const button = (await pane.getByRole("button", { name: "Reset progress" }).boundingBox())?.y ?? 0;
  expect(above).toBeLessThan(button);
  await pane.getByRole("button", { name: "Reset progress" }).click();
  await expect(page.getByRole("dialog", { name: "Reset progress?" })).toBeVisible();
});
