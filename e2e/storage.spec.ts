import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedSettings } from "./helpers/profile.ts";

const KEY = "mafatih:profile:2";
const NOT_SAVED = "Your progress can't be saved in this browser.";
const STARTED_FRESH = "Your saved progress could not be read, so Mafatih started fresh.";
const NEWER =
  "This browser holds progress saved by a newer version of Mafatih. It is left untouched, so nothing new will be saved.";

const HOME = "Recitation";

function noticeArea(page: Page): Locator {
  return page.locator("[role=status]:not(main *)");
}

async function store(page: Page, key: string, value: string): Promise<void> {
  await page.addInitScript(([k, v]) => localStorage.setItem(k, v), [key, value] as const);
}

async function blockStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
}

test("the saved interface language wins over the browser's language", async ({ page }) => {
  await store(page, KEY, '{"schema":2,"settings":{"language":"ar"}}');
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("التلاوة");
  await expect(noticeArea(page)).toBeEmpty();
});

test("a first visit has an empty notice area, ready to announce", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HOME);
  await expect(noticeArea(page)).toHaveCount(1);
  await expect(noticeArea(page)).toBeEmpty();
});

test("unreadable saved data starts the app fresh, says so, and keeps a copy of what was there", async ({ page }) => {
  await store(page, KEY, "{not json");
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(HOME);
  await expect(noticeArea(page).getByText(STARTED_FRESH)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("mafatih:profile:2:unreadable"))).toBe("{not json");
  await expectNoAxeViolations(page);
});

test("progress saved by a newer version is reported and left untouched", async ({ page }) => {
  const newer = '{"schema":3,"settings":{"language":"ar"}}';
  await store(page, KEY, newer);
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(noticeArea(page).getByText(NEWER)).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(newer);
});

test("when the browser blocks storage the app still works and says progress cannot be saved", async ({ page }) => {
  await blockStorage(page);
  await page.goto("/#/practice");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Practice");
  await expect(noticeArea(page).getByText(NOT_SAVED)).toBeVisible();
  await expectNoAxeViolations(page);
  await page.setViewportSize({ width: 320, height: 568 });
  await expect(noticeArea(page).getByText(NOT_SAVED)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});

test("storage that fails on every read is reported the same way", async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("denied", "SecurityError");
    };
  });
  await page.goto("/");
  await expect(noticeArea(page).getByText(NOT_SAVED)).toBeVisible();
});

test("the notice sits above the page content, outside it, and is announced after the page has loaded", async ({
  page,
}) => {
  await blockStorage(page);
  await page.goto("/");
  const notice = noticeArea(page).getByText(NOT_SAVED);
  await expect(notice).toBeVisible();
  await expect(page.getByRole("main").getByText(NOT_SAVED)).toHaveCount(0);
  const noticeBox = await notice.boundingBox();
  const headingBox = await page.getByRole("heading", { level: 1 }).boundingBox();
  expect((noticeBox?.y ?? 0) + (noticeBox?.height ?? 0)).toBeLessThanOrEqual(headingBox?.y ?? 0);
  const html = await (await page.request.get("/")).text();
  expect(html).not.toContain(NOT_SAVED);
});

test("the notice stays while moving between pages until it is dismissed, and then stays away", async ({
  page,
  isMobile,
}) => {
  await blockStorage(page);
  await page.goto("/");
  await page.getByRole("link", { name: "Practice" }).click();
  await expect(noticeArea(page).getByText(NOT_SAVED)).toBeVisible();
  const dismiss = noticeArea(page).getByRole("button", { name: "Dismiss" });
  if (isMobile) {
    const box = await dismiss.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await dismiss.click();
  await expect(noticeArea(page)).toBeEmpty();
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: "Custom" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Custom");
  await expect(noticeArea(page)).toBeEmpty();
});

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG", colorScheme: "dark" });

  test("the notices are shown in the interface language", async ({ page }) => {
    await store(page, KEY, '{"schema":7,"settings":{}}');
    await page.goto("/");
    await expect(
      page
        .getByRole("status")
        .getByText("في هذا المتصفح تقدّم حفظه إصدار أحدث من مفاتيح. سيبقى كما هو، ولن يُحفظ أي جديد."),
    ).toBeVisible();
    await expect(noticeArea(page).getByRole("button", { name: "إخفاء" })).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test("unreadable data and blocked storage have Arabic notices too", async ({ page, context }) => {
    await store(page, KEY, "[]");
    await page.goto("/");
    await expect(noticeArea(page).getByText("تعذّرت قراءة تقدّمك المحفوظ، فبدأ مفاتيح من جديد.")).toBeVisible();
    const blocked = await context.newPage();
    await blockStorage(blocked);
    await blocked.goto("/");
    await expect(blocked.getByRole("status").getByText("تعذّر حفظ تقدّمك في هذا المتصفح.")).toBeVisible();
  });
});

test("data left by the old version is neither used nor touched", async ({ page }) => {
  await store(page, "mafatih.profile", '{"settings":{"language":"ar"}}');
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(noticeArea(page)).toBeEmpty();
  expect(await page.evaluate(() => localStorage.getItem("mafatih.profile"))).toBe('{"settings":{"language":"ar"}}');
});

test("a second tab adopts what the first one saved instead of overwriting it later", async ({ context }) => {
  const first = await context.newPage();
  const second = await context.newPage();
  await first.goto("/#/custom");
  await second.goto("/#/custom");
  await expect(second.getByRole("textbox", { name: "Text to type" })).toBeVisible();
  await first.getByRole("textbox", { name: "Text to type" }).fill("بتن");
  await first.getByRole("button", { name: "Start typing" }).click();
  await expect(first.getByRole("region", { name: "Text to type" })).toContainText("بتن");
  await second.getByRole("link", { name: "Practice" }).click();
  await second.getByRole("link", { name: "Custom" }).click();
  await expect(second.getByRole("region", { name: "Text to type" })).toContainText("بتن");
});

test("when saving fails after a change the visitor is told, and the change still applies for this visit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
  });
  await page.goto("/#/custom");
  await expect(noticeArea(page)).toBeEmpty();
  await page.getByRole("textbox", { name: "Text to type" }).fill("بتن");
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(page.getByRole("region", { name: "Text to type" })).toContainText("بتن");
  await expect(page.getByText("Your progress can't be saved in this browser.")).toBeVisible();
});

test.describe("the language asked for in the link", () => {
  test("opens the app in Arabic, saves it as the setting, and leaves the address clean", async ({ page }) => {
    await store(page, KEY, '{"schema":2,"settings":{"language":"en"}}');
    await page.goto("/?lang=ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("التلاوة");
    expect(new URL(page.url()).search).toBe("");
    expect((await savedSettings(page)).language).toBe("ar");
  });

  test("works on a first visit from an English browser and keeps the page asked for", async ({ page }) => {
    await page.goto("/?lang=ar#/practice");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("التمرين");
    expect(new URL(page.url()).hash).toBe("#/practice");
    expect(new URL(page.url()).search).toBe("");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("can also be written after the route, as in #/recitation/1?lang=ar", async ({ page }) => {
    await page.goto("/#/recitation/1?lang=ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("الفاتحة");
    expect(new URL(page.url()).hash).toBe("#/recitation/1");
    expect(new URL(page.url()).search).toBe("");
    expect((await savedSettings(page)).language).toBe("ar");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
  });

  test("a language chosen in Settings afterwards is not undone by a reload", async ({ page }) => {
    await page.goto("/?lang=ar#/practice");
    await page.getByRole("button", { name: "الإعدادات" }).click();
    await page.getByRole("dialog", { name: "الإعدادات" }).getByRole("radio", { name: "English" }).check();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("English can be asked for as well, against a saved Arabic profile", async ({ page }) => {
    await store(page, KEY, '{"schema":2,"settings":{"language":"ar"}}');
    await page.goto("/?lang=en");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect((await savedSettings(page)).language).toBe("en");
  });

  test("a language that is not offered changes nothing and leaves the address alone", async ({ page }) => {
    await page.goto("/?lang=fr");
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    expect(new URL(page.url()).search).toBe("?lang=fr");
  });

  test("with storage blocked the app still opens in Arabic, and says nothing is saved, in Arabic", async ({ page }) => {
    await blockStorage(page);
    await page.goto("/?lang=ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    await expect(noticeArea(page).getByText("تعذّر حفظ تقدّمك في هذا المتصفح.")).toBeVisible();
  });

  test("progress saved by a newer version stays untouched while the page opens in the language asked for", async ({
    page,
  }) => {
    const newer = '{"schema":3,"settings":{"language":"en"}}';
    await store(page, KEY, newer);
    await page.goto("/?lang=ar");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");
    expect(await page.evaluate((key) => localStorage.getItem(key), KEY)).toBe(newer);
  });
});
