import { expect, test } from "@playwright/test";
import { expectNoAxeViolations } from "./helpers/axe.ts";
import { savedSettings, seedProfile, seedSettings } from "./helpers/profile.ts";
import { doneText, surface, typeKeys } from "./helpers/typing.ts";

const NOTHING = "There is nothing to type in this text.";

test("a first visit asks for a text, with a labelled field and a hint", async ({ page }) => {
  await page.goto("/#/custom");
  const field = page.getByRole("textbox", { name: "Text to type" });
  await expect(field).toBeVisible();
  await expect(field).toHaveValue("");
  await expect(field).toHaveAccessibleDescription("Paste or write any Arabic text.");
  await expect(page.getByRole("button", { name: "Start typing" })).toBeVisible();
  await expect(surface(page)).toHaveCount(0);
  await expectNoAxeViolations(page);
});

for (const [name, text] of [
  ["empty", ""],
  ["only spaces and line breaks", "  \n "],
  ["only Latin letters", "hello world"],
] as const) {
  test(`a text that is ${name} is refused with a message tied to the field`, async ({ page }) => {
    await page.goto("/#/custom");
    const field = page.getByRole("textbox", { name: "Text to type" });
    await field.fill(text);
    await page.getByRole("button", { name: "Start typing" }).click();
    await expect(page.getByRole("alert")).toHaveText(NOTHING);
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await expect(field).toHaveAccessibleDescription(new RegExp(NOTHING));
    await expect(field).toBeFocused();
    await expect(surface(page)).toHaveCount(0);
    await expectNoAxeViolations(page);
  });
}

test("a text made only of marks has nothing to type while no marks are asked for", async ({ page }) => {
  await seedSettings(page, { vocalization: "letters" });
  await page.goto("/#/custom");
  await page.getByRole("textbox", { name: "Text to type" }).fill("ًٌٍَُِّْ");
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(page.getByRole("alert")).toHaveText(NOTHING);
});

test("starting saves the text and typing can begin at once, without another click", async ({ page }) => {
  await page.goto("/#/custom");
  await page.getByRole("textbox", { name: "Text to type" }).fill("  بسم \n الله ");
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(surface(page)).toContainText("بسم الله");
  expect((await savedSettings(page)).customText).toBe("بسم الله");
  await typeKeys(page, [..."بسم الله"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toBeFocused();
});

test("the finished summary gives speed, accuracy and mistakes, and offers to type again or edit", async ({ page }) => {
  await seedSettings(page, { customText: "بت" });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, ["ب", "س", "Backspace", "ت"]);
  const heading = page.getByRole("heading", { level: 2, name: "Finished" });
  await expect(heading).toBeFocused();
  await expect(heading).toHaveAccessibleDescription(/Speed.+Accuracy\s*50%\s*Mistakes\s*1/);
  await expect(page.getByRole("term")).toHaveText(["Speed (characters per minute)", "Accuracy", "Mistakes"]);
  await expect(page.getByRole("definition").nth(1)).toHaveText("50%");
  await expect(page.getByRole("definition").nth(2)).toHaveText("1");
  await expect(page.getByRole("status").filter({ hasText: "Finished" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Finished" })).toHaveCount(0);
  await expectNoAxeViolations(page);
  await page.getByRole("button", { name: "Type again" }).click();
  await expect(heading).toHaveCount(0);
  await typeKeys(page, ["ب", "ت"]);
  await expect(page.getByRole("definition").nth(1)).toHaveText("100%");
});

test("the message about a refused text goes away as soon as the text is changed", async ({ page }) => {
  await page.goto("/#/custom");
  const field = page.getByRole("textbox", { name: "Text to type" });
  const calm = await field.evaluate((element) => getComputedStyle(element).borderColor);
  await field.fill("abc");
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(field).not.toHaveCSS("border-color", calm);
  await field.press("End");
  await page.keyboard.insertText("ب");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(field).not.toHaveAttribute("aria-invalid");
  await expect(field).toHaveCSS("border-color", calm);
  await expect(field).toHaveAccessibleDescription("Paste or write any Arabic text.");
});

test("a text saved in another tab never replaces the lesson being typed", async ({ page, context }) => {
  await seedSettings(page, { customText: "بتن" });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, ["ب", "ت"]);
  const other = await context.newPage();
  await other.goto("/#/custom");
  await other.getByRole("button", { name: "Edit text" }).click();
  await other.getByRole("textbox", { name: "Text to type" }).fill("كل");
  await other.getByRole("button", { name: "Start typing" }).click();
  await expect(surface(other)).toContainText("كل");
  await expect.poll(async () => (await savedSettings(page)).customText).toBe("كل");
  await page.bringToFront();
  await expect(surface(page).locator("[data-lesson-text]")).toHaveText("بتن");
  await page.getByRole("textbox", { name: "Type the text shown" }).focus();
  await typeKeys(page, ["ن"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toBeFocused();
  await expect(page.getByRole("definition").nth(2)).toHaveText("0");
  await page.getByRole("button", { name: "Edit text" }).click();
  await expect(page.getByRole("textbox", { name: "Text to type" })).toHaveValue("كل");
});

test("a saved text is offered again after a reload, and waits for the typist to start", async ({ page }) => {
  await seedSettings(page, { customText: "بت" });
  await page.goto("/#/custom");
  await expect(surface(page)).toContainText("بت");
  await typeKeys(page, ["ب"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toHaveCount(0);
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, ["ب", "ت"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toBeFocused();
});

test("the text can be edited: the field comes back holding the current text", async ({ page }) => {
  await seedSettings(page, { customText: "بت" });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Edit text" }).click();
  const field = page.getByRole("textbox", { name: "Text to type" });
  await expect(field).toHaveValue("بت");
  await expect(field).toBeFocused();
  await field.fill("نم");
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(surface(page)).toContainText("نم");
  await typeKeys(page, ["ن", "م"]);
  await expect(page.getByRole("heading", { level: 2, name: "Finished" })).toBeFocused();
});

test("a very long text is shortened to the limit, and the page says so", async ({ page }) => {
  await page.goto("/#/custom");
  await page.getByRole("textbox", { name: "Text to type" }).fill("كتاب ".repeat(1200));
  await page.getByRole("button", { name: "Start typing" }).click();
  await expect(page.getByText("The text was shortened to 5,000 characters.")).toBeVisible();
  expect(String((await savedSettings(page)).customText)).toHaveLength(4999);
});

test.describe("Arabic", () => {
  test.use({ locale: "ar-EG" });

  test("the Custom page works in Arabic", async ({ page }) => {
    await page.goto("/#/custom");
    await page.getByRole("button", { name: "ابدأ الكتابة" }).click();
    await expect(page.getByRole("alert")).toHaveText("لا يوجد في هذا النص ما يمكن كتابته.");
    await page.getByRole("textbox", { name: "النص المطلوب كتابته" }).fill("بت");
    await page.getByRole("button", { name: "ابدأ الكتابة" }).click();
    await typeKeys(page, ["ب", "ت"]);
    await expect(page.getByRole("heading", { level: 2, name: "اكتمل" })).toBeFocused();
    await expect(page.getByRole("definition").nth(1)).toHaveText("١٠٠٪؜");
    await expectNoAxeViolations(page);
  });
});

test("on Auto the marks to type are the ones unlocked in Practice, as in every other mode", async ({ page }) => {
  const fatha = String.fromCodePoint(0x64e);
  await seedProfile(page, { ladder: { unlocked: 37 }, settings: { customText: `ب${fatha}ت` } });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe("ب");
});

test("on Auto a learner with no marks unlocked types letters only", async ({ page }) => {
  const fatha = String.fromCodePoint(0x64e);
  await seedProfile(page, { settings: { customText: `ب${fatha}ت` } });
  await page.goto("/#/custom");
  await page.getByRole("button", { name: "Start typing" }).click();
  await typeKeys(page, ["ب"]);
  expect(await doneText(page)).toBe(`ب${fatha}`);
});
