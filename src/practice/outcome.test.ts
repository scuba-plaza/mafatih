import { expect, test } from "vitest";
import { statOf } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import { initialProgress } from "./ladder.ts";
import { applyPracticeLesson, type PracticeState } from "./outcome.ts";

const FRESH: PracticeState = { stats: {}, progress: initialProgress() };

function hits(expected: string, count: number, latencyMs = 400): Sample[] {
  return Array.from({ length: count }, () => ({ expected, correct: true, latencyMs }));
}

test("every sample of the lesson is recorded on its key", () => {
  const samples: Sample[] = [...hits("ب", 3), { expected: "ب", correct: false, latencyMs: null }, ...hits("ا", 2)];
  const { stats } = applyPracticeLesson(FRESH, samples);
  expect(statOf(stats, "ب")).toMatchObject({ attempts: 4, hits: 3, timed: 3 });
  expect(statOf(stats, "ا")).toMatchObject({ attempts: 2, hits: 2 });
  expect(FRESH.stats).toEqual({});
});

test("a lesson that masters the newest letter unlocks the next rung and says which", () => {
  const outcome = applyPracticeLesson(FRESH, hits("ش", 20));
  expect(outcome.progress).toEqual({ unlocked: 11 });
  expect(outcome.unlocked).toEqual({ kind: "letter", char: "ر" });
});

test("a lesson that does not master the newest letter leaves the ladder as it was", () => {
  const outcome = applyPracticeLesson(FRESH, hits("ب", 40));
  expect(outcome.progress).toBe(FRESH.progress);
  expect(outcome.unlocked).toBeUndefined();
});

test("one lesson never unlocks more than one rung, however much it holds", () => {
  const outcome = applyPracticeLesson(FRESH, [...hits("ش", 30), ...hits("ر", 30), ...hits("ة", 30)]);
  expect(outcome.progress).toEqual({ unlocked: 11 });
  expect(applyPracticeLesson(outcome, []).progress).toEqual({ unlocked: 12 });
});

test("a stricter bar can be passed in", () => {
  const strict = { minSamples: 50, letterMs: 700, markMs: 1000, minAccuracy: 0.95 };
  expect(applyPracticeLesson(FRESH, hits("ش", 20), strict).unlocked).toBeUndefined();
});
