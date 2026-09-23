import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionState } from "~/engine/session/session.ts";
import { applyKey, createSession, expectedChar, isComplete, metrics } from "~/engine/session/session.ts";

function typeAll(state: SessionState, keys: readonly string[], step = 100): SessionState {
  let next = state;
  let at = 0;
  for (const key of keys) {
    at += step;
    next = applyKey(next, key, at);
  }
  return next;
}

test("a session splits the target into codepoints, marks included", () => {
  const state = createSession("بِ");
  assert.deepEqual(state.chars, ["ب", "ِ"]);
  assert.equal(state.outcomes.length, 2);
  assert.equal(expectedChar(state), "ب");
});

test("correct keys advance the cursor", () => {
  const state = typeAll(createSession("لنا"), ["ل", "ن", "ا"]);
  assert.equal(state.cursor, 3);
  assert.equal(state.errors, 0);
  assert.ok(isComplete(state));
  assert.deepEqual([...state.outcomes], ["correct", "correct", "correct"]);
});

test("a wrong key does not advance the cursor", () => {
  let state = createSession("لنا");
  state = applyKey(state, "ل", 100);
  state = applyKey(state, "م", 200);
  assert.equal(state.cursor, 1, "cursor must not move past an error");
  assert.equal(state.errors, 1);
  assert.equal(state.errorAt, 1);
  assert.equal(expectedChar(state), "ن");
});

test("typing the right key after an error records it as corrected", () => {
  let state = createSession("لنا");
  state = typeAll(state, ["ل", "م", "ن", "ا"]);
  assert.ok(isComplete(state));
  assert.deepEqual([...state.outcomes], ["correct", "corrected", "correct"]);
  assert.equal(state.errors, 1);
});

test("repeated wrong keys accumulate errors without moving", () => {
  let state = createSession("لا");
  state = typeAll(state, ["م", "م", "م"]);
  assert.equal(state.cursor, 0);
  assert.equal(state.errors, 3);
});

test("the lam-alef ligature key satisfies two positions in one press", () => {
  let state = createSession("لا");
  state = applyKey(state, "ﻻ", 100);
  assert.equal(state.cursor, 2);
  assert.equal(state.errors, 0);
  assert.ok(isComplete(state));
});

test("the same target is satisfied by two separate presses", () => {
  const state = typeAll(createSession("لا"), ["ل", "ا"]);
  assert.equal(state.cursor, 2);
  assert.equal(state.errors, 0);
  assert.ok(isComplete(state));
});

test("hamza-carrying ligature keys expand correctly", () => {
  for (const [key, target] of [
    ["ﻹ", "لإ"],
    ["ﻷ", "لأ"],
    ["ﻵ", "لآ"],
  ] as [string, string][]) {
    const state = applyKey(createSession(target), key, 100);
    assert.equal(state.cursor, 2, `${key} should satisfy ${target}`);
    assert.ok(isComplete(state));
  }
});

test("combining marks are their own cursor stops", () => {
  let state = createSession("بِسْمِ");
  assert.equal(state.chars.length, 6);
  state = applyKey(state, "ب", 100);
  assert.equal(expectedChar(state), "ِ", "the kasra is its own position");
  state = applyKey(state, "س", 200);
  assert.equal(state.errors, 1, "skipping the haraka is an error");
  assert.equal(state.cursor, 1);
  state = typeAll(state, ["ِ", "س", "ْ", "م", "ِ"]);
  assert.ok(isComplete(state));
});

test("modifier and navigation keys are ignored", () => {
  let state = createSession("لا");
  for (const key of ["Shift", "Control", "Alt", "ArrowLeft", "Tab", "Enter", "CapsLock"]) {
    state = applyKey(state, key, 50);
  }
  assert.equal(state.cursor, 0);
  assert.equal(state.errors, 0);
  assert.equal(state.keystrokes, 0);
});

test("backspace clears the error flag without moving the cursor", () => {
  let state = createSession("لا");
  state = applyKey(state, "م", 100);
  assert.equal(state.errorAt, 0);
  state = applyKey(state, "Backspace", 150);
  assert.equal(state.errorAt, null);
  assert.equal(state.cursor, 0);
  assert.equal(state.errors, 1);
});

test("keys are ignored once the session is complete", () => {
  let state = typeAll(createSession("لا"), ["ل", "ا"]);
  const finishedAt = state.finishedAt;
  state = applyKey(state, "م", 9999);
  assert.equal(state.finishedAt, finishedAt);
  assert.equal(state.errors, 0);
  assert.equal(state.keystrokes, 2);
});

test("metrics compute cpm, wpm and accuracy", () => {
  const state = typeAll(createSession("لنا"), ["ل", "ن", "ا"], 1000);
  const m = metrics(state);
  assert.equal(m.typedChars, 3);
  assert.equal(m.elapsedMs, 2000);
  assert.ok(Math.abs(m.cpm - 90) < 0.001, `cpm was ${m.cpm}`);
  assert.ok(Math.abs(m.wpm - 18) < 0.001, `wpm was ${m.wpm}`);
  assert.equal(m.accuracy, 1);
});

test("accuracy reflects wrong keystrokes", () => {
  const state = typeAll(createSession("لنا"), ["ل", "م", "ن", "ا"]);
  const m = metrics(state);
  assert.equal(m.errors, 1);
  assert.ok(Math.abs(m.accuracy - 0.75) < 0.001, `accuracy was ${m.accuracy}`);
});

test("metrics on an untouched session do not divide by zero", () => {
  const m = metrics(createSession("لا"));
  assert.equal(m.elapsedMs, 0);
  assert.equal(m.cpm, 0);
  assert.equal(m.wpm, 0);
  assert.equal(m.accuracy, 0);
});
