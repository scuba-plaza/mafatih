import { expect, test } from "vitest";
import { wordInProgress } from "./ligature.ts";

const TEXT = "بتن لا كتب";

test("a word is in progress once its first letter is typed and until its last letter is", () => {
  expect(wordInProgress(TEXT, 1, 0, TEXT.length)).toEqual({ start: 0, end: 3 });
  expect(wordInProgress(TEXT, 2, 0, TEXT.length)).toEqual({ start: 0, end: 3 });
  expect(wordInProgress(TEXT, 5, 0, TEXT.length)).toEqual({ start: 4, end: 6 });
});

test("no word is in progress before its first letter or after its last", () => {
  expect(wordInProgress(TEXT, 0, 0, TEXT.length)).toBeNull();
  expect(wordInProgress(TEXT, 4, 0, TEXT.length)).toBeNull();
  expect(wordInProgress(TEXT, 3, 0, TEXT.length)).toBeNull();
  expect(wordInProgress(TEXT, 6, 0, TEXT.length)).toBeNull();
  expect(wordInProgress(TEXT, TEXT.length, 0, TEXT.length)).toBeNull();
});

test("the word never reaches past the block it is in", () => {
  expect(wordInProgress("بتنكتب", 2, 0, 3)).toEqual({ start: 0, end: 3 });
  expect(wordInProgress("بتنكتب", 4, 3, 6)).toEqual({ start: 3, end: 6 });
  expect(wordInProgress("بتنكتب", 3, 3, 6)).toBeNull();
});

test("any kind of space ends a word", () => {
  expect(wordInProgress("ب ت", 1, 0, 3)).toBeNull();
  expect(wordInProgress("بتن لا", 5, 0, 6)).toEqual({ start: 4, end: 6 });
});
