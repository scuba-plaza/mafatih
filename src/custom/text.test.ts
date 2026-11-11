import { expect, test } from "vitest";
import { FATHA, SHADDA } from "~/text/arabic.ts";
import { buildPrompt } from "~/text/prompt.ts";
import { CUSTOM_TEXT_LIMIT, hasSomethingToType, prepareCustomText } from "./text.ts";

test("whitespace of any kind becomes single spaces, with none at the ends", () => {
  expect(prepareCustomText("  بسم \n\n\t الله  ")).toEqual({ text: "بسم الله", truncated: false });
  expect(prepareCustomText("a\r\nb c")).toEqual({ text: "a b c", truncated: false });
});

test("empty or blank text stays empty", () => {
  expect(prepareCustomText("")).toEqual({ text: "", truncated: false });
  expect(prepareCustomText(" \n ")).toEqual({ text: "", truncated: false });
});

test("pasted lam-alef presentation forms become their two letters, so they can be typed", () => {
  expect(prepareCustomText("ﻻ ﻷ ﻹ ﻵ ﻼ").text).toBe("لا لأ لإ لآ لا");
});

test("marks are put in the order they are typed, shadda first", () => {
  expect(prepareCustomText(`رب${FATHA}${SHADDA}`).text).toBe(`رب${SHADDA}${FATHA}`);
});

test("everything else is kept exactly as written", () => {
  expect(prepareCustomText("Hello، كِتَابٌ 123!").text).toBe("Hello، كِتَابٌ 123!");
});

test("text up to the limit is kept whole", () => {
  expect(CUSTOM_TEXT_LIMIT).toBe(5000);
  const text = "كتب ".repeat(1250).trim();
  expect(text).toHaveLength(4999);
  expect(prepareCustomText(text)).toEqual({ text, truncated: false });
});

test("longer text is cut at the last whole word within the limit, and says so", () => {
  const prepared = prepareCustomText("كتاب ".repeat(1200));
  expect(prepared.truncated).toBe(true);
  expect(prepared.text).toHaveLength(4999);
  expect(prepared.text.endsWith(" كتاب")).toBe(true);
  expect(prepared.text.split(" ").every((word) => word === "كتاب")).toBe(true);
});

test("one enormous word is cut at the limit, since it has no word boundary", () => {
  const prepared = prepareCustomText("ب".repeat(6000));
  expect(prepared).toEqual({ text: "ب".repeat(5000), truncated: true });
});

test("a cut never splits a letter from its marks or a character in two", () => {
  const cluster = `ب${SHADDA}${FATHA}`;
  const prepared = prepareCustomText(cluster.repeat(2000));
  expect(prepared.text).toBe(cluster.repeat(1666));
  const emoji = prepareCustomText("😀".repeat(3000));
  expect(emoji.text).toBe("😀".repeat(2500));
});

test("a text has something to type when it asks for more than spaces", () => {
  const none: ReadonlySet<string> = new Set();
  expect(hasSomethingToType(buildPrompt("بسم الله", none))).toBe(true);
  expect(hasSomethingToType(buildPrompt("hello 5 world", none))).toBe(true);
  expect(hasSomethingToType(buildPrompt("hello world", none))).toBe(false);
  expect(hasSomethingToType(buildPrompt("", none))).toBe(false);
  expect(hasSomethingToType(buildPrompt(`${FATHA}${SHADDA}`, none))).toBe(false);
  expect(hasSomethingToType(buildPrompt(`${FATHA}${SHADDA}`, new Set([FATHA])))).toBe(true);
});
