import { expect, type Locator, type Page, test } from "@playwright/test";
import { openSettingsGroup } from "./helpers/pages.ts";

interface Flow {
  readonly name: string;
  readonly open: (page: Page) => Promise<Locator>;
  readonly keep: string;
  readonly confirm: string;
  readonly danger: boolean;
}

const FLOWS: readonly Flow[] = [
  {
    name: "Unlock all keys",
    open: async (page) => {
      await page.goto("/#/practice");
      await page.getByRole("button", { name: "Unlock all keys" }).click();
      return page.getByRole("dialog", { name: "Unlock all keys?" });
    },
    keep: "Not now",
    confirm: "Unlock",
    danger: false,
  },
  {
    name: "Reset progress",
    open: async (page) => {
      await page.goto("/#/practice");
      const pane = await openSettingsGroup(page, "General");
      await pane.getByRole("button", { name: "Reset progress" }).click();
      return page.getByRole("dialog", { name: "Reset progress?" });
    },
    keep: "Keep my progress",
    confirm: "Reset",
    danger: true,
  },
];

async function box(locator: Locator) {
  const found = await locator.boundingBox();
  if (found === null) {
    throw new Error("not on screen");
  }
  return found;
}

for (const flow of FLOWS) {
  test(`${flow.name} is a confirmation dialog with the shared layout`, async ({ page }) => {
    const dialog = await flow.open(page);
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button")).toHaveCount(2);
    const keep = dialog.getByRole("button", { name: flow.keep, exact: true });
    const confirm = dialog.getByRole("button", { name: flow.confirm, exact: true });
    await expect(keep).toBeFocused();
    const frame = await box(dialog);
    const title = await box(dialog.getByRole("heading"));
    const first = await box(keep);
    const last = await box(confirm);
    expect(title.y).toBeLessThan(first.y);
    expect(Math.abs(first.y - last.y)).toBeLessThan(2);
    expect(first.x + first.width).toBeLessThan(last.x);
    expect(frame.x + frame.width - (last.x + last.width)).toBeLessThan(40);
  });

  test(`${flow.name}: Escape and a click outside both keep things as they were`, async ({ page }) => {
    const dialog = await flow.open(page);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await flow.open(page);
    await page.mouse.click(2, 2);
    await expect(dialog).toBeHidden();
  });
}

test("a danger confirmation is told apart from a normal one by its confirm button", async ({ page }) => {
  const colours: Record<string, string> = {};
  for (const flow of FLOWS) {
    const dialog = await flow.open(page);
    colours[flow.name] = await dialog
      .getByRole("button", { name: flow.confirm, exact: true })
      .evaluate((element) => getComputedStyle(element).color);
    await page.keyboard.press("Escape");
    if (flow.danger) {
      await page.keyboard.press("Escape");
    }
  }
  const channels = (colour: string | undefined): number[] =>
    (colour?.match(/[\d.]+/g) ?? []).slice(0, 3).map((part) => Number(part));
  const [red = 0, green = 0, blue = 0] = channels(colours["Reset progress"]);
  expect(red).toBeGreaterThan(green + 40);
  expect(red).toBeGreaterThan(blue + 40);
  expect(colours["Unlock all keys"]).not.toBe(colours["Reset progress"]);
});
