import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accuracyOf,
  emptyStats,
  isMastered,
  type KeyStats,
  RECENT_ACCURACY_ALPHA,
  recentAccuracyOf,
  recordKeystroke,
  sanitizeStats,
  statFor,
} from "~/engine/stats/keystats.ts";

const WARMUP = Math.round(1 / RECENT_ACCURACY_ALPHA);

function typeRun(stats: KeyStats, char: string, outcomes: readonly boolean[]): KeyStats {
  return outcomes.reduce((next, correct) => recordKeystroke(next, char, 300, correct), stats);
}

test("recent accuracy is the exact mean while a character is still new", () => {
  const outcomes = [false, true, true, true, false, true, true, true, true, true];
  const stat = statFor(typeRun(emptyStats(), "ب", outcomes), "ب");
  assert.ok(Math.abs(recentAccuracyOf(stat) - accuracyOf(stat)) < 1e-9);
  assert.equal(accuracyOf(stat), 0.8);
});

test("an untouched character has no recent accuracy yet", () => {
  assert.equal(recentAccuracyOf(statFor(emptyStats(), "ب")), 0);
});

test("old mistakes fade once the typing turns clean, while the lifetime ratio keeps them", () => {
  let stats = typeRun(
    emptyStats(),
    "ب",
    Array.from({ length: WARMUP }, (_, i) => i % 5 !== 0),
  );
  stats = typeRun(stats, "ب", Array(40).fill(true));
  const stat = statFor(stats, "ب");
  assert.ok(recentAccuracyOf(stat) >= 0.95, `recent ${recentAccuracyOf(stat)}`);
  assert.ok(accuracyOf(stat) < 0.95, `lifetime ${accuracyOf(stat)}`);
  assert.equal(isMastered(stat, 8, 700, 0.95), true);
});

test("a fresh burst of mistakes pulls recent accuracy down despite a long clean record", () => {
  let stats = typeRun(emptyStats(), "ب", Array(400).fill(true));
  stats = typeRun(stats, "ب", Array(5).fill(false));
  const stat = statFor(stats, "ب");
  assert.ok(accuracyOf(stat) > 0.98);
  assert.ok(recentAccuracyOf(stat) < 0.95);
  assert.equal(isMastered(stat, 8, 700, 0.95), false);
});

test("stats stored before recent accuracy existed inherit their lifetime ratio", () => {
  const stats = sanitizeStats({ ي: { char: "ي", samples: 180, meanMs: 300, hits: 180, misses: 20 } });
  const stat = statFor(stats, "ي");
  assert.equal(stat.recentAccuracy, 0.9);
  assert.equal(stat.hits, 180);
  assert.equal(stat.misses, 20);
  assert.equal(stat.meanMs, 300);
});

test("a stored recent accuracy survives, and nonsense in storage is repaired", () => {
  const stats = sanitizeStats({
    ا: { char: "ا", samples: 10, meanMs: 250, hits: 10, misses: 2, recentAccuracy: 0.97 },
    ل: { samples: "x", meanMs: -3, hits: null, misses: Number.NaN, recentAccuracy: 4 },
    ن: "garbage",
  });
  assert.equal(statFor(stats, "ا").recentAccuracy, 0.97);
  assert.deepEqual(statFor(stats, "ل"), {
    char: "ل",
    samples: 0,
    meanMs: 0,
    hits: 0,
    misses: 0,
    recentAccuracy: 1,
  });
  assert.equal(statFor(stats, "ن").samples, 0);
  assert.deepEqual(sanitizeStats([1, 2]), {});
  assert.deepEqual(sanitizeStats(null), {});
});
