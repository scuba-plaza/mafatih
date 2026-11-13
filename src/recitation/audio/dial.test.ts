import { expect, test } from "vitest";
import { requiredMarks } from "~/text/vocalization.ts";
import { buildPassage } from "../passage.ts";
import { loadSurah } from "../quran.ts";
import { arcLengths, stopWeights } from "./dial.ts";

const NO_MARKS = requiredMarks("letters", new Set());

const BAQARA = await loadSurah(2);
const RAHMAN = await loadSurah(55);
const NABA = await loadSurah(78);

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

test("each ayah weighs its number of words, and the basmala that opens a surah is a stop of its own", () => {
  expect(stopWeights(buildPassage(BAQARA, 281, 4, NO_MARKS))).toEqual([15, 129, 32, 28]);
  expect(stopWeights(buildPassage(RAHMAN, 2, 3, NO_MARKS))).toEqual([2, 2, 2]);
  expect(stopWeights(buildPassage(NABA, 1, 4, NO_MARKS))).toEqual([4, 2, 3, 4, 2]);
});

test("one stop takes the whole ring", () => {
  expect(arcLengths([50], 200, 15)).toEqual([200]);
});

test("arcs share the ring in proportion to their weights when none is too small", () => {
  const arcs = arcLengths([8, 11, 15, 6], 200, 15);
  expect(sum(arcs)).toBeCloseTo(200, 6);
  expect(arcs[0]).toBeCloseTo(40, 6);
  expect(arcs[1]).toBeCloseTo(55, 6);
  expect(arcs[2]).toBeCloseTo(75, 6);
  expect(arcs[3]).toBeCloseTo(30, 6);
});

test("a stop that would be too small keeps the minimum and the others share what is left", () => {
  const arcs = arcLengths([1, 2, 2, 2], 100, 15);
  expect(arcs[0]).toBe(15);
  expect(sum(arcs)).toBeCloseTo(100, 6);
  for (const arc of arcs.slice(1)) {
    expect(arc).toBeCloseTo(28.3333, 3);
  }
});

test("next to a very long ayah the short ones keep the minimum and the long one gets the rest", () => {
  const arcs = arcLengths([15, 129, 32, 28], 200, 15);
  expect(arcs[0]).toBe(15);
  expect(sum(arcs)).toBeCloseTo(200, 6);
  expect(Math.min(...arcs)).toBeGreaterThanOrEqual(15);
  expect(arcs[1]).toBeGreaterThan(arcs[2] ?? 0);
  expect(arcs[2]).toBeGreaterThan(arcs[3] ?? 0);
  expect(arcs[1]).toBeCloseTo(((200 - 15) * 129) / (129 + 32 + 28), 6);
});

test("when the minimum cannot be kept for every stop the ring is shared equally", () => {
  expect(arcLengths([1, 50, 3], 30, 15)).toEqual([10, 10, 10]);
});
