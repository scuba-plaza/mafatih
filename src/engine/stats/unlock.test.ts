import assert from "node:assert/strict";
import { test } from "node:test";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import {
  accuracyOf,
  emptyStats,
  type KeyStats,
  recordKeystroke,
  sanitizeStats,
  statFor,
} from "~/engine/stats/keystats.ts";
import {
  advanceProgress,
  DEFAULT_UNLOCK_CONFIG,
  focusLetter,
  initialProgress,
  type Progress,
  STARTING_LETTERS,
  shouldAdvanceTier,
  shouldUnlockNext,
  unlockedLetters,
} from "~/engine/stats/unlock.ts";

const cfg = DEFAULT_UNLOCK_CONFIG;

function drill(stats: KeyStats, chars: readonly string[], times: number, latencyMs: number, correct = true): KeyStats {
  let next = stats;
  for (let i = 0; i < times; i += 1) {
    for (const char of chars) {
      next = recordKeystroke(next, char, latencyMs, correct);
    }
  }
  return next;
}

test("a fresh profile starts with six letters at tier none", () => {
  const progress = initialProgress();
  assert.equal(progress.unlockedCount, STARTING_LETTERS);
  assert.equal(progress.tier, "none");
  assert.equal(unlockedLetters(progress).length, STARTING_LETTERS);
});

test("no unlock without enough samples", () => {
  const progress = initialProgress();
  const focus = focusLetter(progress);
  assert.ok(focus);
  const stats = drill(emptyStats(), [focus], cfg.minSamples - 1, 200);
  assert.equal(shouldUnlockNext(stats, progress, cfg), false);
});

test("no unlock while the focus letter is too slow", () => {
  const progress = initialProgress();
  const focus = focusLetter(progress);
  assert.ok(focus);
  const stats = drill(emptyStats(), [focus], cfg.minSamples * 3, cfg.targetMs + 500);
  assert.equal(shouldUnlockNext(stats, progress, cfg), false);
});

test("no unlock while accuracy is below threshold", () => {
  const progress = initialProgress();
  const focus = focusLetter(progress);
  assert.ok(focus);
  let stats = drill(emptyStats(), [focus], cfg.minSamples * 2, 200);
  stats = drill(stats, [focus], 10, 200, false);
  assert.equal(shouldUnlockNext(stats, progress, cfg), false);
});

test("a fast accurate focus letter unlocks the next one", () => {
  const progress = initialProgress();
  const focus = focusLetter(progress);
  assert.ok(focus);
  const stats = drill(emptyStats(), [focus], cfg.minSamples * 2, 200);
  assert.equal(shouldUnlockNext(stats, progress, cfg), true);
  assert.equal(advanceProgress(stats, progress, cfg).unlockedCount, STARTING_LETTERS + 1);
});

test("a focus letter held back by old mistakes unlocks once recent typing is clean", () => {
  const progress = initialProgress();
  const focus = focusLetter(progress);
  assert.ok(focus);
  const stuck: KeyStats = sanitizeStats({ [focus]: { char: focus, samples: 180, meanMs: 300, hits: 180, misses: 20 } });
  assert.equal(shouldUnlockNext(stuck, progress, cfg), false);
  const recovered = drill(stuck, [focus], 15, 300);
  assert.ok(accuracyOf(statFor(recovered, focus)) < cfg.minAccuracy);
  assert.equal(shouldUnlockNext(recovered, progress, cfg), true);
});

test("the tier waits for recent accuracy, not a lifetime of clean typing", () => {
  const progress = initialProgress();
  let stats = drill(emptyStats(), unlockedLetters(progress), 30, 200);
  stats = drill(stats, unlockedLetters(progress), 4, 200, false);
  assert.equal(shouldAdvanceTier(stats, progress, cfg), false);
  stats = drill(stats, unlockedLetters(progress), 30, 200);
  assert.equal(shouldAdvanceTier(stats, progress, cfg), true);
});

test("unlocking stops at the end of the alphabet", () => {
  const progress: Progress = { unlockedCount: letterOrder.length, tier: "full" };
  const focus = focusLetter(progress);
  assert.ok(focus);
  const stats = drill(emptyStats(), [focus], cfg.minSamples * 2, 150);
  assert.equal(shouldUnlockNext(stats, progress, cfg), false);
  assert.equal(advanceProgress(stats, progress, cfg).unlockedCount, letterOrder.length);
});

test("tier advances none -> core -> full once accuracy holds", () => {
  let progress = initialProgress();
  let stats = drill(emptyStats(), unlockedLetters(progress), 20, 200);
  assert.equal(shouldAdvanceTier(stats, progress, cfg), true);
  progress = { ...progress, tier: advanceProgress(stats, progress, cfg).tier };
  assert.equal(progress.tier, "core");

  stats = drill(stats, [...unlockedLetters(progress), "َ", "ُ", "ِ", "ْ", "ّ"], 20, 200);
  assert.equal(advanceProgress(stats, progress, cfg).tier, "full");
});

test("tier does not advance past full", () => {
  const progress: Progress = { unlockedCount: 10, tier: "full" };
  const stats = drill(emptyStats(), unlockedLetters(progress), 30, 150);
  assert.equal(shouldAdvanceTier(stats, progress, cfg), false);
  assert.equal(advanceProgress(stats, progress, cfg).tier, "full");
});

test("tier does not advance on a sloppy run", () => {
  const progress = initialProgress();
  let stats = drill(emptyStats(), unlockedLetters(progress), 10, 200);
  stats = drill(stats, unlockedLetters(progress), 10, 200, false);
  assert.equal(shouldAdvanceTier(stats, progress, cfg), false);
});
