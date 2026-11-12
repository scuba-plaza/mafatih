import { expect, test } from "vitest";
import { type LessonRecord, recordLesson, sanitizeHistory } from "./history.ts";

const LESSON: LessonRecord = { at: 1_700_000_000_000, mode: "practice", chars: 38, ms: 21_500, accuracy: 0.95 };

test("a finished lesson is added after the earlier ones, which stay as they were", () => {
  const earlier = [LESSON];
  const later = { ...LESSON, at: LESSON.at + 60_000, mode: "recitation" as const };
  expect(recordLesson(earlier, later)).toEqual([LESSON, later]);
  expect(earlier).toEqual([LESSON]);
});

test("only the last hundred lessons are kept", () => {
  const many = Array.from({ length: 130 }, (_, index) => ({ ...LESSON, at: index }));
  const kept = many.reduce<readonly LessonRecord[]>(recordLesson, []);
  expect(kept).toHaveLength(100);
  expect(kept[0]?.at).toBe(30);
  expect(kept.at(-1)?.at).toBe(129);
});

test("saved history comes back as it was", () => {
  const history = [LESSON, { ...LESSON, mode: "custom" as const, accuracy: 1, chars: 0, ms: 0 }];
  expect(sanitizeHistory(JSON.parse(JSON.stringify(history)))).toEqual(history);
});

test("anything that is not a list of lessons becomes an empty history", () => {
  for (const raw of [undefined, null, 3, "x", { 0: LESSON }]) {
    expect(sanitizeHistory(raw)).toEqual([]);
  }
});

test("broken lessons are dropped, the rest kept in order, and a long list is cut to its last hundred", () => {
  const broken = [
    { ...LESSON, mode: "quiz" },
    { ...LESSON, at: "now" },
    { ...LESSON, at: -1 },
    { ...LESSON, chars: 2.5 },
    { ...LESSON, chars: -3 },
    { ...LESSON, ms: -1 },
    { ...LESSON, ms: 1e300 },
    { ...LESSON, accuracy: 1.2 },
    { ...LESSON, accuracy: null },
    null,
    "lesson",
    [LESSON],
  ];
  const good = { ...LESSON, at: 5 };
  expect(sanitizeHistory([LESSON, ...broken, good])).toEqual([LESSON, good]);
  expect(sanitizeHistory([{ ...LESSON, extra: "x" }])).toEqual([LESSON]);
  const long = Array.from({ length: 5000 }, (_, index) => ({ ...LESSON, at: index }));
  expect(sanitizeHistory(long).map((lesson) => lesson.at)).toEqual(
    Array.from({ length: 100 }, (_, index) => 4900 + index),
  );
});

test("a lesson is kept only with a time the calendar can show, at most a day of typing and a length a lesson can have", () => {
  const latestDate = 8.64e15;
  const day = 86_400_000;
  const kept = [
    { ...LESSON, at: latestDate },
    { ...LESSON, ms: day },
    { ...LESSON, ms: 0.5 },
    { ...LESSON, chars: 100_000 },
  ];
  const dropped = [
    { ...LESSON, at: 9e15 },
    { ...LESSON, at: Number.POSITIVE_INFINITY },
    { ...LESSON, ms: day + 1 },
    { ...LESSON, ms: 9e15 },
    { ...LESSON, ms: Number.NaN },
    { ...LESSON, chars: 100_001 },
    { ...LESSON, chars: 2 ** 53 },
  ];
  expect(sanitizeHistory([...kept, ...dropped])).toEqual(kept);
  for (const lesson of sanitizeHistory([...kept, ...dropped])) {
    expect(Number.isNaN(new Date(lesson.at).getTime())).toBe(false);
  }
});
