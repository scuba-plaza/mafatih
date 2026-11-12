import { readFile } from "node:fs/promises";
import { expect, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedProfile, seedProfile } from "./helpers/profile.ts";

const STAT = { attempts: 9, hits: 9, timed: 9, meanMs: 300, recentAccuracy: 1 };
const LESSON = { at: 1_700_000_000_000, mode: "recitation", chars: 120, ms: 60_000, accuracy: 0.98 };
const RECITATION = { position: { surah: 36, ayah: 5 }, surahs: { 36: { typed: [[1, 4]], completions: 0 } } };
const FILE_LABEL = "Restore from a backup file";

function backupOf(settings: Record<string, unknown> = {}): string {
  const profile = {
    schema: 2,
    settings: { language: "en", fontSize: 56, ...settings },
    ladder: { unlocked: 30 },
    stats: { practice: { ش: STAT }, recitation: {}, custom: {} },
    history: [LESSON],
    recitation: RECITATION,
  };
  return JSON.stringify({ app: "mafatih", schema: 2, exportedAt: "2026-11-12T10:00:00.000Z", profile });
}

function file(text: string | Buffer) {
  return { name: "backup.json", mimeType: "application/json", buffer: Buffer.from(text) };
}

function dialog(page: Page) {
  return page.getByRole("dialog", { name: "Settings" });
}

async function openSettings(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(dialog(page)).toBeVisible();
}

function section(page: Page) {
  return dialog(page).getByRole("group", { name: "Backup and restore" });
}

function hud(page: Page) {
  return page.getByRole("region", { name: "Your progress" });
}

test("Download backup saves a file named by the day, holding the whole profile", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 20 }, stats: { practice: { ش: STAT } }, history: [LESSON] });
  await page.goto("/#/practice");
  await openSettings(page);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    section(page).getByRole("button", { name: "Download backup" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^mafatih-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const envelope = JSON.parse(await readFile(path, "utf8"));
  expect(envelope).toMatchObject({ app: "mafatih", schema: 2 });
  expect(Number.isNaN(Date.parse(envelope.exportedAt))).toBe(false);
  expect(envelope.profile).toMatchObject({
    schema: 2,
    ladder: { unlocked: 20 },
    stats: { practice: { ش: STAT }, recitation: {}, custom: {} },
    history: [LESSON],
  });
  await expect(dialog(page).getByRole("status").filter({ hasText: "Backup downloaded." })).toHaveCount(1);
});

test("choosing a backup asks first, then replaces the progress and settings and says so", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 12 } });
  await page.goto("/#/practice");
  await expect(hud(page).getByText("12 of 44")).toBeVisible();
  await openSettings(page);
  await section(page).getByLabel(FILE_LABEL).setInputFiles(file(backupOf()));
  const question = section(page).getByRole("group", { name: "Replace your current progress?" });
  await expect(question).toBeVisible();
  await expect(question).toHaveAccessibleDescription(/progress and settings on this device will be replaced/);
  await expect(question.getByRole("button", { name: "Keep my progress" })).toBeFocused();
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 12 });
  await question.getByRole("button", { name: "Replace" }).click();
  await expect(question).toHaveCount(0);
  await expect(dialog(page).getByRole("status").filter({ hasText: "Progress restored." })).toHaveCount(1);
  await expect(section(page).getByLabel(FILE_LABEL)).toBeFocused();
  const profile = await savedProfile(page);
  expect(profile.ladder).toEqual({ unlocked: 30 });
  expect(profile.history).toEqual([LESSON]);
  expect(profile.recitation).toEqual(RECITATION);
  expect(profile.stats).toEqual({ practice: { ش: STAT }, recitation: {}, custom: {} });
  expect(profile.settings).toMatchObject({ fontSize: 56 });
  await dialog(page).getByRole("button", { name: "Done" }).click();
  await expect(hud(page).getByText("30 of 44")).toBeVisible();
});

test("Keep my progress leaves everything as it was and says nothing", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 12 } });
  await page.goto("/#/practice");
  await openSettings(page);
  await section(page).getByLabel(FILE_LABEL).setInputFiles(file(backupOf()));
  await section(page).getByRole("button", { name: "Keep my progress" }).click();
  await expect(section(page).getByRole("group", { name: "Replace your current progress?" })).toHaveCount(0);
  await expect(section(page).getByLabel(FILE_LABEL)).toBeFocused();
  await expect(dialog(page).getByRole("status").filter({ hasText: "Progress restored." })).toHaveCount(0);
  expect((await savedProfile(page)).ladder).toEqual({ unlocked: 12 });
});

const FAILURES = [
  { name: "too large", content: () => Buffer.alloc(2_000_001, "x"), message: "This file is too large to be a backup." },
  {
    name: "not JSON",
    content: () => "just some words",
    message: "This file could not be read. Choose a file made by Download backup.",
  },
  { name: "not a backup", content: () => '{"hello":"world"}', message: "This is not a Mafatih backup file." },
  {
    name: "from another version",
    content: () => '{"app":"mafatih","schema":1,"profile":{}}',
    message: "This backup was made by another version of Mafatih and cannot be restored.",
  },
] as const;

for (const failure of FAILURES) {
  test(`a file that is ${failure.name} gets its own alert tied to the field and changes nothing`, async ({ page }) => {
    await seedProfile(page, { ladder: { unlocked: 12 } });
    await page.goto("/#/practice");
    await openSettings(page);
    const input = section(page).getByLabel(FILE_LABEL);
    await input.setInputFiles(file(failure.content()));
    const alert = section(page).getByRole("alert");
    await expect(alert).toHaveText(failure.message);
    await expect(input).toHaveAttribute("aria-invalid", "true");
    await expect(input).toHaveAccessibleDescription(failure.message);
    await expect(section(page).getByRole("group", { name: "Replace your current progress?" })).toHaveCount(0);
    expect((await savedProfile(page)).ladder).toEqual({ unlocked: 12 });
    await expectNoAxeViolations(page);
  });
}

test("the same bad file can be chosen again and a good file clears the alert", async ({ page }) => {
  await seedProfile(page, { ladder: { unlocked: 12 } });
  await page.goto("/#/practice");
  await openSettings(page);
  const input = section(page).getByLabel(FILE_LABEL);
  await input.setInputFiles(file("nonsense"));
  await expect(section(page).getByRole("alert")).toHaveCount(1);
  await input.setInputFiles([]);
  await input.setInputFiles(file("nonsense"));
  await expect(section(page).getByRole("alert")).toHaveCount(1);
  await input.setInputFiles(file(backupOf()));
  await expect(section(page).getByRole("alert")).toHaveCount(0);
  await expect(input).not.toHaveAttribute("aria-invalid", "true");
  await expect(section(page).getByRole("group", { name: "Replace your current progress?" })).toBeVisible();
});

test("the section, its question and its alert pass axe in light and dark", async ({ page }) => {
  for (const scheme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto("/#/practice");
    await openSettings(page);
    await section(page).getByLabel(FILE_LABEL).setInputFiles(file(backupOf()));
    await expect(section(page).getByRole("group", { name: "Replace your current progress?" })).toBeVisible();
    await expectNoAxeViolations(page);
    await section(page).getByRole("button", { name: "Keep my progress" }).click();
    await section(page).getByLabel(FILE_LABEL).setInputFiles(file("nonsense"));
    await expect(section(page).getByRole("alert")).toBeVisible();
    await expectNoAxeViolations(page);
    await page.reload();
  }
});

test("the section fits and works at 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/#/practice");
  await openSettings(page);
  await section(page).getByLabel(FILE_LABEL).setInputFiles(file(backupOf()));
  await expect(section(page).getByRole("button", { name: "Keep my progress" })).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBe(0);
  const sheet = await dialog(page).evaluate((element) => element.scrollWidth - element.clientWidth);
  expect(sheet).toBeLessThanOrEqual(0);
});

test("in Arabic the section is in Arabic and restoring a backup in English switches the language", async ({ page }) => {
  await seedProfile(page, { settings: { language: "ar" } });
  await page.goto("/#/practice");
  await page.getByRole("button", { name: "الإعدادات" }).click();
  const arabic = page.getByRole("dialog", { name: "الإعدادات" });
  const group = arabic.getByRole("group", { name: "النسخ الاحتياطي والاستعادة" });
  await expect(group.getByRole("button", { name: "تنزيل نسخة احتياطية" })).toBeVisible();
  await expectNoAxeViolations(page);
  await group.getByLabel("الاستعادة من ملف نسخة احتياطية").setInputFiles(file(backupOf()));
  await group
    .getByRole("group", { name: "هل تريد استبدال تقدمك الحالي؟" })
    .getByRole("button", { name: "استبدال" })
    .click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Settings" }).getByRole("status").filter({ hasText: "Progress restored." }),
  ).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});
