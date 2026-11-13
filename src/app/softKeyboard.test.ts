import { expect, test } from "vitest";
import { softKeyboardOpen, tallestSeen } from "./softKeyboard.ts";

const PHONE = { width: 390, height: 844 };

test("a visual viewport much shorter than the tallest window seen means a soft keyboard is up", () => {
  expect(softKeyboardOpen({ tallest: 844, visible: 500, scale: 1, typing: true })).toBe(true);
  expect(softKeyboardOpen({ tallest: 915, visible: 560, scale: 1, typing: true })).toBe(true);
});

test("a window that shrank together with the viewport still counts, as it does when the page resizes for the keyboard", () => {
  const tallest = tallestSeen(PHONE, 390, 500);
  expect(softKeyboardOpen({ tallest: tallest.height, visible: 500, scale: 1, typing: true })).toBe(true);
});

test("the small changes of a browser bar sliding away are not a keyboard", () => {
  expect(softKeyboardOpen({ tallest: 844, visible: 844, scale: 1, typing: true })).toBe(false);
  expect(softKeyboardOpen({ tallest: 844, visible: 780, scale: 1, typing: true })).toBe(false);
  expect(softKeyboardOpen({ tallest: 844, visible: 700, scale: 1, typing: true })).toBe(false);
});

test("pinch zoom makes the viewport shorter without a keyboard", () => {
  expect(softKeyboardOpen({ tallest: 844, visible: 400, scale: 2, typing: true })).toBe(false);
});

test("without a field being typed in there is no keyboard to make room for", () => {
  expect(softKeyboardOpen({ tallest: 844, visible: 500, scale: 1, typing: false })).toBe(false);
});

test("a window with no height, or a viewport taller than it, is never a keyboard", () => {
  expect(softKeyboardOpen({ tallest: 0, visible: 0, scale: 1, typing: true })).toBe(false);
  expect(softKeyboardOpen({ tallest: 600, visible: 700, scale: 1, typing: true })).toBe(false);
});

test("the tallest height is kept while the width stays, and forgotten when it changes", () => {
  expect(tallestSeen(PHONE, 390, 700)).toEqual(PHONE);
  expect(tallestSeen(PHONE, 390, 900)).toEqual({ width: 390, height: 900 });
  expect(tallestSeen(PHONE, 844, 390)).toEqual({ width: 844, height: 390 });
});
