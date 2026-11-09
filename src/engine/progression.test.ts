import assert from "node:assert/strict";
import { test } from "node:test";
import { TYPEABLE_LETTERS } from "./layout.ts";
import {
  advance,
  beginProgress,
  effectiveTier,
  focusLetter,
  LETTER_ORDER,
  recentAccuracy,
  recordAttempt,
  UNLOCK_ACCURACY,
} from "./progression.ts";

test("the letter order covers every typeable letter exactly once", () => {
  assert.equal(LETTER_ORDER.length, TYPEABLE_LETTERS.length);
  assert.deepEqual([...LETTER_ORDER].sort(), [...TYPEABLE_LETTERS].sort());
});

test("a learner unlocks the next letter after 20 clean attempts", () => {
  let progress = beginProgress();
  assert.equal(focusLetter(progress), "ب");
  for (let i = 0; i < 20; i++) {
    progress = advance(recordAttempt(progress, "ب", true));
  }
  assert.equal(focusLetter(progress), "ي");
});

test("a learner with low recent accuracy stays on the same letter", () => {
  let progress = beginProgress();
  for (let i = 0; i < 10; i++) {
    progress = advance(recordAttempt(progress, "ب", true));
  }
  for (let i = 0; i < 10; i++) {
    progress = advance(recordAttempt(progress, "ب", false));
  }
  assert.equal(focusLetter(progress), "ب");
});

test("recent accuracy uses the early mean then the moving window", () => {
  const stat = { attempts: 30, recent: [] as boolean[] };
  for (let i = 0; i < 10; i++) {
    stat.recent.push(true);
  }
  for (let i = 0; i < 10; i++) {
    stat.recent.push(false);
  }
  assert.equal(recentAccuracy(stat), 0.5);
});

test("harakat tiers unlock only after all letters and practised marks", () => {
  let progress = beginProgress();
  for (const letter of LETTER_ORDER) {
    for (let i = 0; i < 20; i++) {
      progress = advance(recordAttempt(progress, letter, true));
    }
  }
  assert.equal(progress.tier, "none");
  for (const mark of ["َ", "ُ", "ِ", "ْ", "ّ"]) {
    for (let i = 0; i < 8; i++) {
      progress = advance(recordAttempt(progress, mark, true));
    }
  }
  assert.equal(progress.tier, "full");
  assert.equal(effectiveTier(progress, "auto"), "full");
  assert.equal(effectiveTier(progress, "none"), "none");
});

test("a steady 10% error rate never unlocks", () => {
  let progress = beginProgress();
  for (let i = 0; i < 1000; i++) {
    progress = advance(recordAttempt(progress, "ب", i % 10 !== 0));
  }
  assert.ok(recentAccuracy(progress.stats.ب ?? { attempts: 0, recent: [] }) < UNLOCK_ACCURACY);
  assert.equal(focusLetter(progress), "ب");
});
