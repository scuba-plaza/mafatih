import { expect, test } from "vitest";
import type { LessonRecord } from "./history.ts";
import type { KeyStats } from "./keystats.ts";
import { keyRows, recentLessons } from "./rows.ts";

const FATHA = String.fromCodePoint(0x64e);
const SHADDA = String.fromCodePoint(0x651);

function stat(attempts: number, hits: number, timed: number, meanMs: number) {
  return { attempts, hits, timed, meanMs, recentAccuracy: 0 };
}

test("the key table follows the ladder: letters in the order they unlock, then marks, then the other keys", () => {
  const stats: KeyStats = {
    لا: stat(2, 2, 2, 500),
    [SHADDA]: stat(3, 3, 3, 800),
    ب: stat(10, 9, 8, 420),
    " ": stat(5, 5, 5, 300),
    ا: stat(7, 7, 7, 380),
    [FATHA]: stat(4, 3, 2, 640),
  };
  expect(keyRows(stats).map((row) => row.key)).toEqual(["ا", "ب", FATHA, SHADDA, " ", "لا"]);
});

test("a row holds the average time, the share of first-try hits and the attempts", () => {
  const [row] = keyRows({ ب: stat(10, 9, 8, 420.4) });
  expect(row).toEqual({ key: "ب", meanMs: 420.4, accuracy: 0.9, attempts: 10 });
});

test("a key that was only ever missed or typed after a pause has no time yet", () => {
  const [row] = keyRows({ ب: stat(3, 0, 0, 0) });
  expect(row).toEqual({ key: "ب", meanMs: null, accuracy: 0, attempts: 3 });
});

test("no keys, no rows; a key with no attempts is left out", () => {
  expect(keyRows({})).toEqual([]);
  expect(keyRows({ ب: stat(0, 0, 0, 0) })).toEqual([]);
});

function lesson(at: number, mode: LessonRecord["mode"], chars: number, ms: number, accuracy = 1): LessonRecord {
  return { at, mode, chars, ms, accuracy };
}

test("the lessons are listed newest first, at most ten", () => {
  const history = Array.from({ length: 14 }, (_, index) => lesson(index, "practice", 40, 24_000));
  const rows = recentLessons(history);
  expect(rows).toHaveLength(10);
  expect(rows.map((row) => row.at)).toEqual([13, 12, 11, 10, 9, 8, 7, 6, 5, 4]);
  expect(recentLessons(history, 3).map((row) => row.at)).toEqual([13, 12, 11]);
  expect(recentLessons([])).toEqual([]);
});

test("a lesson's speed is its characters per minute, or nothing when it took no time", () => {
  const rows = recentLessons([lesson(1, "recitation", 150, 60_000, 0.97), lesson(2, "custom", 40, 0)]);
  expect(rows[0]).toEqual({ at: 2, mode: "custom", cpm: null, accuracy: 1 });
  expect(rows[1]).toEqual({ at: 1, mode: "recitation", cpm: 150, accuracy: 0.97 });
});
