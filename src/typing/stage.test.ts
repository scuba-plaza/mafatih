import { expect, test } from "vitest";
import { caretRow, caretScrollTop, fitsGuide, type StageMetrics, wholeLines, windowHeight } from "./stage.ts";

const LAPTOP: Omit<StageMetrics, "stage"> = {
  lineHeight: 80,
  padTop: 12,
  gapAboveGuide: 38,
  guide: 236,
  below: 32,
};

test("the keyboard guide fits when the window can still keep two lines next to it", () => {
  expect(fitsGuide({ ...LAPTOP, stage: 482 })).toBe(true);
  expect(fitsGuide({ ...LAPTOP, stage: 478 })).toBe(true);
});

test("the keyboard guide does not fit one pixel short, and not on a small laptop", () => {
  expect(fitsGuide({ ...LAPTOP, stage: 477 })).toBe(false);
  expect(fitsGuide({ ...LAPTOP, stage: 364 })).toBe(false);
});

test("the window shows only whole lines of the room it is given", () => {
  expect(wholeLines(188, 80, 12)).toBe(2);
  expect(wholeLines(484, 80, 12)).toBe(5);
  expect(wholeLines(172, 80, 12)).toBe(2);
});

test("the window always shows at least one line", () => {
  expect(wholeLines(50, 80, 12)).toBe(1);
  expect(wholeLines(0, 80, 12)).toBe(1);
});

test("the window is as tall as its lines plus the padding above them", () => {
  expect(windowHeight(2, 80, 12)).toBe(172);
  expect(windowHeight(5, 80, 12)).toBe(412);
});

test("the caret line is the first row of a short window and the second row of a window of three or more lines", () => {
  expect(caretRow(1)).toBe(0);
  expect(caretRow(2)).toBe(0);
  expect(caretRow(3)).toBe(1);
  expect(caretRow(5)).toBe(1);
});

test("the window scrolls so that the caret sits in the middle of its row", () => {
  expect(caretScrollTop(412, 56, 1, 80, 12)).toBe(308);
  expect(caretScrollTop(412, 56, 0, 80, 12)).toBe(388);
});
