import { expect, test } from "vitest";
import { ligatureAt } from "./ligature.ts";

const FATHA = "َ";
const SHADDA = "ّ";
const FATHATAN = "ً";
const TEXT = "بتن لا كتب";

test("the ligature is found while the cursor is between a lam and the alef that completes it", () => {
  expect(ligatureAt(TEXT, 5, 0, TEXT.length)).toEqual({ start: 4, end: 6, alef: 5 });
  expect(ligatureAt("كلام بتن", 2, 0, 8)).toEqual({ start: 1, end: 3, alef: 2 });
});

test("all four alef forms after a lam complete the ligature", () => {
  for (const alef of ["ا", "آ", "أ", "إ"]) {
    const text = `ل${alef} بتن`;
    expect(ligatureAt(text, 1, 0, text.length)).toEqual({ start: 0, end: 2, alef: 1 });
  }
});

test("marks between the two letters keep the cursor inside the ligature, and the marks of the alef belong to it", () => {
  const text = `ل${FATHA}${SHADDA}ا${FATHATAN} بتن`;
  for (const offset of [1, 2, 3]) {
    expect(ligatureAt(text, offset, 0, text.length), `at ${offset}`).toEqual({ start: 0, end: 5, alef: 3 });
  }
  expect(ligatureAt(text, 4, 0, text.length)).toBeNull();
});

test("no ligature is found before the lam, after the alef, or in words without a lam and its alef", () => {
  expect(ligatureAt(TEXT, 4, 0, TEXT.length)).toBeNull();
  expect(ligatureAt(TEXT, 6, 0, TEXT.length)).toBeNull();
  expect(ligatureAt(TEXT, 1, 0, TEXT.length)).toBeNull();
  expect(ligatureAt(TEXT, 8, 0, TEXT.length)).toBeNull();
});

test("an alef followed by a lam, and two lams, are not the ligature", () => {
  expect(ligatureAt("الله بتن", 2, 0, 8)).toBeNull();
  expect(ligatureAt("الله بتن", 3, 0, 8)).toBeNull();
  expect(ligatureAt("لل بتن", 1, 0, 6)).toBeNull();
});

test("a lam at the end of a word, followed by a space and an alef, is not the ligature", () => {
  expect(ligatureAt("بل ا", 2, 0, 4)).toBeNull();
});

test("the ligature never reaches past the block it is in", () => {
  expect(ligatureAt("بتنلاكتب", 4, 3, 8)).toEqual({ start: 3, end: 5, alef: 4 });
  expect(ligatureAt("بتنلاكتب", 4, 3, 5)).toEqual({ start: 3, end: 5, alef: 4 });
  expect(ligatureAt(`بتنل${FATHA}اً`, 4, 3, 8)).toEqual({ start: 3, end: 7, alef: 5 });
  expect(ligatureAt(`بتنل${FATHA}اً`, 4, 3, 6)).toEqual({ start: 3, end: 6, alef: 5 });
});
