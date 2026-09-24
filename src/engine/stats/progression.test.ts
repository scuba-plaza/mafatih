import assert from "node:assert/strict";
import { test } from "node:test";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import { generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";
import { createRng } from "~/engine/lessons/rng.ts";
import { applyKey, createSession } from "~/engine/session/session.ts";
import { emptyStats, type KeyStats, recordKeystroke } from "~/engine/stats/keystats.ts";
import {
  advanceProgress,
  DEFAULT_UNLOCK_CONFIG,
  focusLetter,
  initialProgress,
  type Progress,
  STARTING_LETTERS,
} from "~/engine/stats/unlock.ts";

interface Learner {
  msPerKey: number;
  errorRate: (lesson: number) => number;
}

interface Practice {
  progress: Progress;
  stats: KeyStats;
  unlockedAfter: readonly number[];
}

const WRONG_KEY = "#";

function practise(learner: Learner, lessons: number, seed: number, start = initialProgress()): Practice {
  const rng = createRng(seed);
  let progress = start;
  let stats = emptyStats();
  let clock = 0;
  const unlockedAfter: number[] = [];

  for (let lesson = 0; lesson < lessons; lesson += 1) {
    const text = generateAdaptiveLesson({
      unlockedCount: progress.unlockedCount,
      tier: progress.tier,
      seed: seed * 10_000 + lesson,
      focusLetter: focusLetter(progress),
    }).text;
    let session = createSession(text);
    for (const char of session.chars) {
      clock += learner.msPerKey * (0.6 + rng.next() * 0.8);
      if (rng.next() < learner.errorRate(lesson)) {
        session = applyKey(session, WRONG_KEY, clock);
        clock += learner.msPerKey;
      }
      session = applyKey(session, char, clock);
    }
    clock += 1000;
    stats = session.records
      .slice(1)
      .reduce((next, record) => recordKeystroke(next, record.expected, record.latencyMs, record.correct), stats);
    progress = advanceProgress(stats, progress, DEFAULT_UNLOCK_CONFIG);
    unlockedAfter.push(progress.unlockedCount);
  }

  return { progress, stats, unlockedAfter };
}

const SEEDS = [1, 2, 3];

test("a careful typist climbs through most of the alphabet, with the harakat waiting for the rest", () => {
  for (const seed of SEEDS) {
    const { progress } = practise({ msPerKey: 400, errorRate: () => 0.02 }, 150, seed);
    assert.ok(progress.unlockedCount >= 20, `seed ${seed}: ${progress.unlockedCount} letters`);
    assert.ok(progress.unlockedCount < letterOrder.length, `seed ${seed}`);
    assert.equal(progress.tier, "none", `seed ${seed}`);
  }
});

test("with the alphabet complete, a careful typist works through both tiers of harakat", () => {
  const start: Progress = { unlockedCount: letterOrder.length, tier: "none" };
  for (const seed of SEEDS) {
    const { progress } = practise({ msPerKey: 400, errorRate: () => 0.02 }, 60, seed, start);
    assert.equal(progress.tier, "full", `seed ${seed}`);
  }
});

test("a typist who slips on one key in sixteen still keeps unlocking letters", () => {
  for (const seed of SEEDS) {
    const { progress } = practise({ msPerKey: 400, errorRate: () => 0.06 }, 200, seed);
    assert.ok(progress.unlockedCount >= 16, `seed ${seed}: ${progress.unlockedCount} letters`);
  }
});

test("a sloppy first hour does not hold back a typist who then settles down", () => {
  const sloppyLessons = 120;
  for (const seed of SEEDS) {
    const { unlockedAfter } = practise(
      { msPerKey: 400, errorRate: (lesson) => (lesson < sloppyLessons ? 0.2 : 0.02) },
      sloppyLessons + 60,
      seed,
    );
    const atRecovery = unlockedAfter[sloppyLessons - 1] ?? 0;
    const later = unlockedAfter[unlockedAfter.length - 1] ?? 0;
    assert.ok(later - atRecovery >= 8, `seed ${seed}: ${atRecovery} -> ${later} letters`);
  }
});

test("typing that stays sloppy does not earn letters by luck", () => {
  for (const seed of SEEDS) {
    const { progress } = practise({ msPerKey: 400, errorRate: () => 0.2 }, 100, seed);
    assert.ok(progress.unlockedCount <= STARTING_LETTERS + 2, `seed ${seed}: ${progress.unlockedCount} letters`);
    assert.equal(progress.tier, "none", `seed ${seed}`);
  }
});

test("a fast but slow-to-react typist is held at the latency target", () => {
  const { progress } = practise({ msPerKey: 1100, errorRate: () => 0 }, 60, 1);
  assert.equal(progress.unlockedCount, STARTING_LETTERS);
  assert.ok(letterOrder.length > STARTING_LETTERS);
});
