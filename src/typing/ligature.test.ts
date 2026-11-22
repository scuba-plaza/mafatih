import { expect, test } from "vitest";
import { ligatureWordAt } from "./ligature.ts";

const FATHA = "\u064E";
const SHADDA = "\u0651";
const TEXT = "بتن لا كتب";

test("the word is found while the cursor is between a lam and the alef that completes it", () => {
  expect(ligatureWordAt(TEXT, 5, 0, TEXT.length)).toEqual({ start: 4, end: 6 });
  expect(ligatureWordAt("كلام بتن", 2, 0, 8)).toEqual({ start: 0, end: 4 });
});

test("all four alef forms after a lam complete the ligature", () => {
  for (const alef of ["ا", "آ", "أ", "إ"]) {
    const text = `ل${alef} بتن`;
    expect(ligatureWordAt(text, 1, 0, text.length)).toEqual({ start: 0, end: 2 });
  }
});

test("marks between the lam and the alef keep the cursor inside the ligature", () => {
  const text = `ل${FATHA}${SHADDA}ا بتن`;
  expect(ligatureWordAt(text, 1, 0, text.length)).toEqual({ start: 0, end: 4 });
  expect(ligatureWordAt(text, 2, 0, text.length)).toEqual({ start: 0, end: 4 });
  expect(ligatureWordAt(text, 3, 0, text.length)).toEqual({ start: 0, end: 4 });
  expect(ligatureWordAt(text, 4, 0, text.length)).toBeNull();
});

test("no word is found before the lam, after the alef, or in words without a lam and its alef", () => {
  expect(ligatureWordAt(TEXT, 4, 0, TEXT.length)).toBeNull();
  expect(ligatureWordAt(TEXT, 6, 0, TEXT.length)).toBeNull();
  expect(ligatureWordAt(TEXT, 1, 0, TEXT.length)).toBeNull();
  expect(ligatureWordAt(TEXT, 8, 0, TEXT.length)).toBeNull();
});

test("an alef followed by a lam, and two lams, are not the ligature", () => {
  expect(ligatureWordAt("الله بتن", 2, 0, 8)).toBeNull();
  expect(ligatureWordAt("الله بتن", 3, 0, 8)).toBeNull();
  expect(ligatureWordAt("لل بتن", 1, 0, 6)).toBeNull();
});

test("a lam at the end of a word, followed by a space and an alef, is not the ligature", () => {
  expect(ligatureWordAt("بل ا", 2, 0, 4)).toBeNull();
  expect(ligatureWordAt("بل ا", 2, 0, 4)).toBeNull();
});

test("the word never reaches past the block it is in, and a no-break space ends a word", () => {
  expect(ligatureWordAt("بتنلاكتب", 4, 3, 8)).toEqual({ start: 3, end: 8 });
  expect(ligatureWordAt("بتنلاكتب", 4, 3, 5)).toEqual({ start: 3, end: 5 });
  expect(ligatureWordAt("بتن لا كتب", 5, 0, 10)).toEqual({ start: 4, end: 6 });
});
