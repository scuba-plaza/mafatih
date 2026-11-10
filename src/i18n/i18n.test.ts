import { expect, test } from "vitest";
import { ar } from "./ar.ts";
import { en } from "./en.ts";
import { detectLanguage, directionOf, fillMessage, formatNumber, formatPercent, translate } from "./i18n.ts";

const PLACEHOLDER = /\{(\w+)\}/g;

function placeholders(message: string): string[] {
  return [...message.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "").sort();
}

test("the first supported preferred language wins, English is the fallback", () => {
  expect(detectLanguage(["ar-EG", "en"])).toBe("ar");
  expect(detectLanguage(["fr", "en-GB", "ar"])).toBe("en");
  expect(detectLanguage(["fr", "ar"])).toBe("ar");
  expect(detectLanguage(["fr"])).toBe("en");
  expect(detectLanguage([])).toBe("en");
});

test("Arabic reads right to left, English left to right", () => {
  expect(directionOf("ar")).toBe("rtl");
  expect(directionOf("en")).toBe("ltr");
});

test("numbers use the digits of the interface language", () => {
  expect(formatNumber("en", 1234)).toBe("1,234");
  expect(formatNumber("ar", 1234)).toBe("١٬٢٣٤");
  expect(formatNumber("en", 512.4)).toBe("512");
});

test("ratios are shown as whole percentages", () => {
  expect(formatPercent("en", 0.953)).toBe("95%");
  expect(formatPercent("ar", 0.953)).toContain("٩٥");
  expect(formatPercent("en", 1)).toBe("100%");
});

test("both catalogs define exactly the same messages", () => {
  expect(Object.keys(ar).sort()).toEqual(Object.keys(en).sort());
});

test("every message uses the same placeholders in both languages", () => {
  for (const key of Object.keys(en) as (keyof typeof en)[]) {
    expect(placeholders(ar[key]), key).toEqual(placeholders(en[key]));
  }
});

test("every Arabic message is written in Arabic", () => {
  for (const [key, message] of Object.entries(ar)) {
    expect(message, key).toMatch(/[ء-ي]/);
  }
});

test("a message is looked up in the chosen language", () => {
  expect(translate("en", "app.name")).toBe("Mafatih");
  expect(translate("ar", "app.name")).toBe("مفاتيح");
});

test("placeholders are filled in, with numbers in the language's digits", () => {
  expect(fillMessage("en", "{done} of {total}", { done: 3, total: 1200 })).toBe("3 of 1,200");
  expect(fillMessage("ar", "{done} من {total}", { done: 3, total: 1200 })).toBe("٣ من ١٬٢٠٠");
  expect(fillMessage("en", "Unlocked: {key}", { key: "ك" })).toBe("Unlocked: ك");
  expect(fillMessage("en", "No placeholders")).toBe("No placeholders");
});

test("a missing placeholder value is an error, never shipped as raw braces", () => {
  expect(() => fillMessage("en", "{done} of {total}", { done: 3 })).toThrow(/total/);
});
