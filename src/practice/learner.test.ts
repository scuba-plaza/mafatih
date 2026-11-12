import { expect, test } from "vitest";
import { applyKey, createSession, expectedText, isComplete } from "~/typing/session.ts";
import { initialProgress } from "./ladder.ts";
import { buildPracticeLesson } from "./lesson.ts";
import { applyPracticeLesson, type PracticeState } from "./outcome.ts";
import { loadWords } from "./words.ts";

interface Learner {
  readonly errorRate: number;
  readonly latencyMs: number;
}

const WORDS = await loadWords();
const BREAK_BETWEEN_LESSONS_MS = 10_000;
const OPTIONS = { requireBackspace: false };
const SLOW = { timeout: 60_000 };

function createChance(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function practise(learner: Learner, lessons: number, seed: number): number {
  const chance = createChance(seed);
  let state: PracticeState = { stats: {}, progress: initialProgress() };
  let time = 0;
  for (let index = 0; index < lessons; index += 1) {
    const prompt = buildPracticeLesson({
      words: WORDS,
      progress: state.progress,
      vocalization: "auto",
      seed: seed * 1000 + index,
    });
    let session = createSession(prompt);
    time += BREAK_BETWEEN_LESSONS_MS;
    while (!isComplete(session)) {
      const [char = ""] = expectedText(session) ?? "";
      time += learner.latencyMs;
      if (chance() < learner.errorRate) {
        session = applyKey(session, { kind: "char", char: char === "ض" ? "ص" : "ض" }, time, OPTIONS);
        time += learner.latencyMs;
      }
      session = applyKey(session, { kind: "char", char }, time, OPTIONS);
    }
    state = applyPracticeLesson(state, session.samples);
  }
  return state.progress.unlocked;
}

test("a learner who never misses climbs the whole ladder, marks included, in 120 lessons", SLOW, () => {
  expect(practise({ errorRate: 0, latencyMs: 400 }, 120, 1)).toBe(44);
});

test("a careful learner with 3% mistakes has every letter within 150 lessons", SLOW, () => {
  for (const seed of [1, 2]) {
    expect(practise({ errorRate: 0.03, latencyMs: 500 }, 150, seed)).toBeGreaterThanOrEqual(36);
  }
});

test("a learner who misses one key in five stays on the starter letters", SLOW, () => {
  for (const seed of [1, 2, 3]) {
    expect(practise({ errorRate: 0.2, latencyMs: 500 }, 100, seed)).toBeLessThanOrEqual(11);
  }
});

test("a learner who never misses but needs 900 ms a key unlocks nothing", SLOW, () => {
  expect(practise({ errorRate: 0, latencyMs: 900 }, 60, 1)).toBe(10);
});
