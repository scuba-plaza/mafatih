import { expect, test } from "@playwright/test";
import { seedSettings } from "./helpers/profile.ts";
import { startTyping, surface } from "./helpers/typing.ts";

test.use({
  viewport: { width: 1366, height: 768 },
  launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH, ignoreDefaultArgs: ["--hide-scrollbars"] },
});

test.skip(({ browserName }) => browserName !== "chromium", "the launch options below only exist in Chromium");

test("the passage window has no scrollbar", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium-desktop", "the viewport and launch options are set here");
  await seedSettings(page, {});
  await page.goto("/#/recitation/2/255");
  await expect(surface(page)).toBeVisible();
  await startTyping(page);
  const lesson = surface(page).locator("[data-lesson-text]");
  expect(await lesson.evaluate((element) => element.scrollHeight - element.clientHeight)).toBeGreaterThan(40);
  expect(
    await lesson.evaluate((element) =>
      element instanceof HTMLElement ? element.offsetWidth - element.clientWidth : Number.NaN,
    ),
  ).toBe(0);
  await expect(lesson).toHaveCSS("scrollbar-width", "none");
  const before = await lesson.evaluate((element) => element.scrollTop);
  const box = await lesson.boundingBox();
  await page.mouse.move((box?.x ?? 0) + 24, (box?.y ?? 0) + 24);
  await page.mouse.wheel(0, 120);
  await expect.poll(() => lesson.evaluate((element) => element.scrollTop)).toBeGreaterThan(before);
});
