import { expect, test } from "vitest";
import { softKeyboardOpen } from "./softKeyboard.ts";

test("a visual viewport much shorter than the window means a soft keyboard is up", () => {
  expect(softKeyboardOpen(844, 500)).toBe(true);
  expect(softKeyboardOpen(915, 560)).toBe(true);
});

test("the small changes of a browser bar sliding away are not a keyboard", () => {
  expect(softKeyboardOpen(844, 844)).toBe(false);
  expect(softKeyboardOpen(844, 780)).toBe(false);
  expect(softKeyboardOpen(844, 700)).toBe(false);
});

test("a window with no height, or a viewport taller than it, is never a keyboard", () => {
  expect(softKeyboardOpen(0, 0)).toBe(false);
  expect(softKeyboardOpen(600, 700)).toBe(false);
});
