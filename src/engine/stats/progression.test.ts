import assert from "node:assert/strict";
import { test } from "node:test";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import { practise } from "~/engine/stats/simulate.ts";
import { STARTING_LETTERS } from "~/engine/stats/unlock.ts";

const SEEDS = [1, 2, 3];

test("a careful typist climbs through most of the alphabet and all the tiers", () => {
  for (const seed of SEEDS) {
    const { progress } = practise({ msPerKey: 400, errorRate: () => 0.02 }, 150, seed);
    assert.ok(progress.unlockedCount >= 24, `seed ${seed}: ${progress.unlockedCount} letters`);
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
