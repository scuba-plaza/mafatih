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
const OPTIONS = { requireBackspace: true };
const SLOW = { timeout: 60_000 };
const WRONG_KEY = "ض";
const OTHER_WRONG_KEY = "ص";

function createChance(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function practise(learner: Learner, lessons: number, seed: number): number {
  const chance = createChance(seed);
  const pause = () => learner.latencyMs * (0.8 + 0.4 * chance());
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
      const key = expectedText(session) ?? "";
      if (chance() < learner.errorRate) {
        const wrong = key === WRONG_KEY ? OTHER_WRONG_KEY : WRONG_KEY;
        time += pause();
        session = applyKey(session, { kind: "char", char: wrong }, time, OPTIONS);
        time += pause();
        session = applyKey(session, { kind: "backspace" }, time, OPTIONS);
      }
      time += pause();
      session = applyKey(session, { kind: "char", char: key }, time, OPTIONS);
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

test("a learner who misses one key in three unlocks nothing", SLOW, () => {
  for (const seed of [1, 2, 3]) {
    expect(practise({ errorRate: 1 / 3, latencyMs: 500 }, 100, seed)).toBe(10);
  }
});

test("a learner who misses one key in five gains a few letters at most in 100 lessons", SLOW, () => {
  for (const seed of [10, 11]) {
    expect(practise({ errorRate: 0.2, latencyMs: 500 }, 100, seed)).toBeLessThanOrEqual(14);
  }
});

test("a learner who never misses but needs about 900 ms a key unlocks nothing", SLOW, () => {
  expect(practise({ errorRate: 0, latencyMs: 900 }, 60, 1)).toBe(10);
});

test("the speed bar from near: about 650 ms a key has every letter in 100 lessons, about 760 ms crawls", SLOW, () => {
  expect(practise({ errorRate: 0, latencyMs: 650 }, 100, 1)).toBeGreaterThanOrEqual(36);
  expect(practise({ errorRate: 0, latencyMs: 760 }, 100, 3)).toBeLessThanOrEqual(18);
});
