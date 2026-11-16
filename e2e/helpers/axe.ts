import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { FIREFOX_AXE_DIALOG_CRASH } from "./engines.ts";

const STANDARDS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

export async function expectNoAxeViolations(page: Page): Promise<void> {
  const firefox = page.context().browser()?.browserType().name() === "firefox";
  if (firefox && (await page.evaluate(() => document.querySelector("dialog[open]") !== null))) {
    test.info().annotations.push({ type: "axe skipped", description: FIREFOX_AXE_DIALOG_CRASH });
    return;
  }
  const { violations } = await new AxeBuilder({ page }).withTags(STANDARDS).analyze();
  expect(
    violations.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(", ")}`),
  ).toEqual([]);
}
