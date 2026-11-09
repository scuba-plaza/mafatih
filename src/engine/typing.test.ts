import assert from "node:assert/strict";
import { test } from "node:test";
import { accuracyOf, applyKey, beginTyping, elapsedOf } from "./typing.ts";

const WORD = "بَيْت";

test("the cursor advances on correct keys and finishes the word", () => {
  let state = beginTyping(WORD);
  for (const char of WORD) {
    state = applyKey(state, char, 1000);
  }
  assert.ok(state.done);
  assert.equal(state.typed, WORD);
  assert.equal(accuracyOf(state), 1);
});

test("the cursor never advances past an error", () => {
  let state = beginTyping(WORD);
  state = applyKey(state, "ب", 1000);
  const wrong = applyKey(state, "ك", 2000);
  assert.equal(wrong.typed, "ب");
  assert.ok(!wrong.done);
  const still = applyKey(wrong, "َ", 3000);
  assert.equal(still.typed, "ب");
  assert.ok(!still.attempts.at(-1)?.correct);
  const fixed = applyKey(applyKey(still, "\b", 4000), "َ", 5000);
  assert.equal(fixed.typed, "بَ");
  assert.equal(accuracyOf(fixed) < 1, true);
});

test("a gap longer than the pause cap is not a latency sample", () => {
  let state = beginTyping("ما");
  state = applyKey(state, "م", 0);
  const slow = applyKey(state, "ا", 10_000);
  assert.equal(slow.attempts.at(-1)?.latency, null);
  let fast = beginTyping("ما");
  fast = applyKey(fast, "م", 0);
  assert.equal(applyKey(fast, "ا", 500).attempts.at(-1)?.latency, 500);
});

test("elapsed time excludes time before the first key", () => {
  const state = beginTyping("ما");
  assert.equal(elapsedOf(state, 5000), 0);
  const started = applyKey(state, "م", 6000);
  assert.equal(elapsedOf(started, 7000), 1000);
});
