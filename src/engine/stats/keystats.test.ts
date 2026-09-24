import assert from "node:assert/strict";
import { test } from "node:test";
import {
  accuracyOf,
  emptyStats,
  isMastered,
  type KeyStats,
  LATENCY_CAP_MS,
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

test("a keystroke after a pause counts for accuracy but not as a latency sample", () => {
  let stats = typeRun(emptyStats(), "ب", Array(10).fill(true));
  const before = statFor(stats, "ب");
  stats = recordKeystroke(stats, "ب", 10 * 60_000, true);
  const after = statFor(stats, "ب");
  assert.equal(after.meanMs, before.meanMs);
  assert.equal(after.samples, before.samples);
  assert.equal(after.hits, before.hits + 1);
  assert.equal(isMastered(after, 8, 700, 0.95), true, "a ten-minute break does not undo mastery");
});

test("a slow but real keystroke under the cap still counts toward latency", () => {
  let stats = typeRun(emptyStats(), "ب", Array(10).fill(true));
  stats = recordKeystroke(stats, "ب", LATENCY_CAP_MS, true);
  const stat = statFor(stats, "ب");
  assert.equal(stat.samples, 11);
  assert.ok(stat.meanMs > 300);
});
