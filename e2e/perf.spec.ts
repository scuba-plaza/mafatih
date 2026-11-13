import { expect, type Page, test } from "@playwright/test";
import { seedSettings } from "./helpers/profile.ts";
import { doneText, startTyping, typeKeys } from "./helpers/typing.ts";

const LONG = "كتب من بيت كل يوم ".repeat(20).trim();
const FONT_FILE = /\.woff2?$/;
const WORDS_CHUNK = /\/assets\/words-/;
const SURAH_CHUNK = /\/assets\/\d{3}-/;
const LONGEST_TASK_MS = 200;
const SETTLE_MS = 1500;
const SPY_ON_SCROLLING = `
  const behaviours = [];
  window.scrollBehaviours = behaviours;
  const note = (options) => behaviours.push(String(options !== null && typeof options === "object" ? options.behavior : undefined));
  const targets = [
    [Element.prototype, "scrollTo"],
    [Element.prototype, "scrollBy"],
    [Element.prototype, "scroll"],
    [Element.prototype, "scrollIntoView"],
    [window, "scrollTo"],
    [window, "scrollBy"],
    [window, "scroll"],
  ];
  for (const [owner, method] of targets) {
    const original = owner[method];
    owner[method] = function (...args) {
      note(args[0]);
      return original.apply(this, args);
    };
  }
`;
const WATCH_LONG_TASKS = `
  const tasks = [];
  window.longTasks = tasks;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) tasks.push({ start: entry.startTime, duration: entry.duration });
  }).observe({ type: "longtask" });
`;

function requestsOf(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (request) => {
    seen.push(new URL(request.url()).pathname);
  });
  return seen;
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(SETTLE_MS);
}

async function startCustom(page: Page): Promise<void> {
  await seedSettings(page, { customText: LONG });
  await page.goto("/#/custom");
  await startTyping(page);
  await expect(page.getByRole("textbox")).toBeFocused();
}

test("the statistics page loads neither the Practice words nor any surah", async ({ page }) => {
  const requests = requestsOf(page);
  await page.goto("/#/stats");
  await expect(page.getByRole("heading", { level: 1, name: "Stats" })).toBeVisible();
  await settle(page);
  expect(requests.filter((path) => WORDS_CHUNK.test(path) || SURAH_CHUNK.test(path))).toEqual([]);
});

test("a surah page loads that surah only, and no Practice words", async ({ page }) => {
  const requests = requestsOf(page);
  await page.goto("/#/recitation/36");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  expect(requests.filter((path) => SURAH_CHUNK.test(path))).toHaveLength(1);
  expect(requests.filter((path) => WORDS_CHUNK.test(path))).toEqual([]);
});

test("Practice loads its words and no surah", async ({ page }) => {
  const requests = requestsOf(page);
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await settle(page);
  expect(requests.filter((path) => WORDS_CHUNK.test(path))).toHaveLength(1);
  expect(requests.filter((path) => SURAH_CHUNK.test(path))).toEqual([]);
});

test("only the interface font is loaded for a page without a lesson, and the lesson fonts only when needed", async ({
  page,
}) => {
  const requests = requestsOf(page);
  await page.goto("/#/custom");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.waitForLoadState("networkidle");
  const before = new Set(requests.filter((path) => FONT_FILE.test(path)));
  expect(before.size).toBeLessThanOrEqual(2);
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.locator("[data-font-sample]")).toHaveCount(3);
  await expect.poll(() => new Set(requests.filter((path) => FONT_FILE.test(path))).size).toBe(4);
});

test("typing a hundred and fifty characters never freezes the page for a fifth of a second and drops none", async ({
  page,
}) => {
  await page.addInitScript(WATCH_LONG_TASKS);
  await startCustom(page);
  const typingStarted = await page.evaluate(() => performance.now());
  const typed = LONG.slice(0, 150);
  await typeKeys(page, [...typed]);
  expect(await doneText(page)).toBe(typed);
  const tasks = await page.evaluate(
    (from) =>
      (window as unknown as { longTasks: { start: number; duration: number }[] }).longTasks
        .filter((task) => task.start >= from)
        .map((task) => task.duration),
    typingStarted,
  );
  expect(Math.max(0, ...tasks)).toBeLessThan(LONGEST_TASK_MS);
});

test("with reduced motion the caret follows the text without animated scrolling", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(SPY_ON_SCROLLING);
  await startCustom(page);
  await typeKeys(page, [...LONG.slice(0, 150)]);
  const behaviours = await page.evaluate(() => (window as unknown as { scrollBehaviours: string[] }).scrollBehaviours);
  expect(behaviours.length).toBeGreaterThan(0);
  expect(behaviours).not.toContain("smooth");
  const computed = await page.evaluate(() =>
    [document.documentElement, document.body, document.querySelector("[data-lesson-text]")].map((element) =>
      element === null ? "missing" : getComputedStyle(element).scrollBehavior,
    ),
  );
  expect(computed).toEqual(["auto", "auto", "auto"]);
});

test("without that preference the same scrolling is animated, which shows the spy sees it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(SPY_ON_SCROLLING);
  await startCustom(page);
  await typeKeys(page, [...LONG.slice(0, 150)]);
  const behaviours = await page.evaluate(() => (window as unknown as { scrollBehaviours: string[] }).scrollBehaviours);
  expect(behaviours).toContain("smooth");
});
