import { expect, test } from "vitest";
import { ar } from "./ar.ts";
import { en } from "./en.ts";
import {
  detectLanguage,
  directionOf,
  fillMessage,
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  isLanguage,
  placeholdersOf,
  translate,
} from "./i18n.ts";

const english: Readonly<Record<string, string>> = en;
const arabic: Readonly<Record<string, string>> = ar;

test("only English and Arabic are languages", () => {
  expect(isLanguage("en")).toBe(true);
  expect(isLanguage("ar")).toBe(true);
  expect(isLanguage("fr")).toBe(false);
  expect(isLanguage("toString")).toBe(false);
  expect(isLanguage(undefined)).toBe(false);
});

test("the first supported preferred language wins, English is the fallback", () => {
  expect(detectLanguage(["ar-EG", "en"])).toBe("ar");
  expect(detectLanguage(["fr", "en-GB", "ar"])).toBe("en");
  expect(detectLanguage(["fr", "ar"])).toBe("ar");
  expect(detectLanguage(["AR"])).toBe("ar");
  expect(detectLanguage(["fr"])).toBe("en");
  expect(detectLanguage([])).toBe("en");
});

test("Arabic reads right to left, English left to right", () => {
  expect(directionOf("ar")).toBe("rtl");
  expect(directionOf("en")).toBe("ltr");
});

test("numbers are rounded to whole numbers in the digits of the interface language", () => {
  expect(formatNumber("en", 1234)).toBe("1,234");
  expect(formatNumber("ar", 1234)).toBe("\u0661\u066C\u0662\u0663\u0664");
  expect(formatNumber("en", 512.4)).toBe("512");
  expect(formatNumber("en", 2.5)).toBe("3");
  expect(formatNumber("en", -5)).toBe("-5");
});

test("a value that rounds to zero never shows a minus sign", () => {
  expect(formatNumber("en", -0.2)).toBe("0");
  expect(formatNumber("ar", -0)).toBe("\u0660");
});

test("ratios are shown as whole percentages with the language's own percent sign", () => {
  expect(formatPercent("en", 0.953)).toBe("95%");
  expect(formatPercent("en", 1)).toBe("100%");
  expect(formatPercent("ar", 0.953)).toBe("\u0669\u0665\u066A\u061C");
});

test("a duration is minutes and two-digit seconds in the language's own digits, rounded to the second", () => {
  expect(formatDuration("en", 0)).toBe("0:00");
  expect(formatDuration("en", 65_400)).toBe("1:05");
  expect(formatDuration("en", 59_600)).toBe("1:00");
  expect(formatDuration("en", 3_725_000)).toBe("62:05");
  expect(formatDuration("en", -5)).toBe("0:00");
  expect(formatDuration("ar", 65_000)).toBe("\u0661:\u0660\u0665");
  expect(() => formatDuration("en", Number.NaN)).toThrow(RangeError);
});

test("a size is in kilobytes below a megabyte and in megabytes above, in the language's own digits", () => {
  expect(formatBytes("en", 0)).toBe("0 kB");
  expect(formatBytes("en", 1_600)).toBe("2 kB");
  expect(formatBytes("en", 999_400)).toBe("999 kB");
  expect(formatBytes("en", 1_460_000)).toBe("1.5 MB");
  expect(formatBytes("en", 12_000_000)).toBe("12 MB");
  expect(formatBytes("en", -5)).toBe("0 kB");
  expect(formatBytes("ar", 1_460_000)).toMatch(/\u0661/);
  expect(() => formatBytes("en", Number.NaN)).toThrow(RangeError);
});

test("a date is shown as a medium date in the language's own digits, in the given or the local time zone", () => {
  const noon = Date.UTC(2026, 10, 12, 12, 0);
  expect(formatDate("en", noon, "UTC")).toBe("Nov 12, 2026");
  expect(formatDate("en", Date.UTC(2026, 10, 12, 23, 30), "Asia/Riyadh")).toBe("Nov 13, 2026");
  expect(formatDate("ar", noon, "UTC")).toMatch(/\u0662\u0660\u0662\u0666/);
  expect(formatDate("en", noon)).toMatch(/2026/);
  expect(() => formatDate("en", Number.NaN)).toThrow(RangeError);
  expect(() => formatDate("en", 8.64e15 + 1)).toThrow(RangeError);
});

test("a number that is not finite is an error, never shown to the user", () => {
  expect(() => formatNumber("en", Number.NaN)).toThrow(RangeError);
  expect(() => formatNumber("ar", Number.POSITIVE_INFINITY)).toThrow(RangeError);
  expect(() => formatPercent("ar", Number.NaN)).toThrow(RangeError);
  expect(() => fillMessage("en", "{n} keys", { n: Number.NaN })).toThrow(RangeError);
});

test("the placeholders of a message are listed in order", () => {
  expect(placeholdersOf("{done} of {total}")).toEqual(["done", "total"]);
  expect(placeholdersOf("{a} and {a}")).toEqual(["a", "a"]);
  expect(placeholdersOf("none, not {} either")).toEqual([]);
});

test("both catalogs define exactly the same messages", () => {
  expect(Object.keys(arabic).sort()).toEqual(Object.keys(english).sort());
});

test("every message uses the same placeholders in both languages", () => {
  for (const [key, message] of Object.entries(english)) {
    expect(placeholdersOf(arabic[key] ?? "").sort(), key).toEqual(placeholdersOf(message).sort());
  }
});

test("every Arabic message is written in Arabic, with no Latin letters outside its placeholders", () => {
  for (const [key, message] of Object.entries(arabic)) {
    const prose = message.replace(/\{\w+\}/g, "");
    expect(prose, key).toMatch(/[\u0621-\u064A]/);
    expect(prose, key).not.toMatch(/[A-Za-z]/);
  }
});

test("a message is looked up in the chosen language", () => {
  expect(translate("en", "app.name")).toBe("Mafatih");
  expect(translate("ar", "app.name")).toBe("\u0645\u0641\u0627\u062A\u064A\u062D");
});

test("numbers are filled in using the language's digits", () => {
  expect(fillMessage("en", "{done} of {total}", { done: 3, total: 1200 })).toBe("3 of 1,200");
  expect(fillMessage("ar", "{done} \u0645\u0646 {total}", { done: 3, total: 1200 })).toBe(
    "\u0663 \u0645\u0646 \u0661\u066C\u0662\u0660\u0660",
  );
  expect(fillMessage("en", "{n} and {n}", { n: 2 })).toBe("2 and 2");
  expect(fillMessage("en", "No placeholders")).toBe("No placeholders");
});

test("text values are isolated so that mixed-direction text cannot reorder the sentence", () => {
  expect(fillMessage("en", "Unlocked: {key}", { key: "\u0643" })).toBe("Unlocked: \u2068\u0643\u2069");
  expect(fillMessage("ar", "{name}!", { name: "Ya-Sin" })).toBe("\u2068Ya-Sin\u2069!");
});

test("a text value is inserted literally, whatever characters it holds", () => {
  expect(fillMessage("en", "[{v}]", { v: "$& $1 {x}" })).toBe("[\u2068$& $1 {x}\u2069]");
});

test("a missing placeholder value is an error, never shipped as raw braces", () => {
  expect(() => fillMessage("en", "{done} of {total}", { done: 3 })).toThrow(/total/);
});

test("a placeholder named like a built-in object property is still missing unless it is given", () => {
  expect(() => fillMessage("en", "{constructor}", {})).toThrow(/constructor/);
  expect(() => fillMessage("en", "{toString}")).toThrow(/toString/);
  expect(() => fillMessage("en", "{__proto__}", {})).toThrow(/__proto__/);
});
