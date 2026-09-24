import assert from "node:assert/strict";
import { test } from "node:test";
import { LIGATURE_KEYS } from "~/engine/layout/ara.ts";
import type { SessionState } from "~/engine/session/session.ts";
import {
  activeMsBetween,
  applyKey,
  createSession,
  expectedKey,
  isComplete,
  isTypedKey,
  metrics,
} from "~/engine/session/session.ts";

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
  assert.equal(expectedKey(state), "ب");
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
  assert.equal(expectedKey(state), "ن");
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
  assert.equal(expectedKey(state), "ِ", "the kasra is its own position");
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

test("Windows sends a lam-alef key as its two letters, and that satisfies both positions", () => {
  assert.equal(isTypedKey("لا"), true);
  assert.equal(isTypedKey("لأ"), true);
  assert.equal(isTypedKey("ab"), false);
  let state = createSession("لا لأ");
  state = applyKey(state, "لا", 100);
  assert.equal(state.cursor, 2);
  state = applyKey(state, " ", 200);
  state = applyKey(state, "لأ", 300);
  assert.equal(state.cursor, 5);
  assert.equal(state.errors, 0);
});

test("Arabic (101) offers exactly four lam-alef ligature keys", () => {
  assert.deepEqual(
    [...LIGATURE_KEYS.entries()].sort(),
    [
      ["لآ", "ﻵ"],
      ["لأ", "ﻷ"],
      ["لإ", "ﻹ"],
      ["لا", "ﻻ"],
    ].sort(),
  );
});

test("the next key is the ligature wherever lam is followed directly by an alef", () => {
  assert.equal(expectedKey(createSession("لا")), "ﻻ");
  assert.equal(expectedKey(createSession("لأن")), "ﻷ");
  assert.equal(expectedKey(createSession("لإ")), "ﻹ");
  assert.equal(expectedKey(createSession("لآ")), "ﻵ");
  assert.equal(expectedKey(createSession("لَا")), "ل", "a haraka between them rules the ligature out");
  assert.equal(expectedKey(createSession("لم")), "ل");
  assert.equal(expectedKey(createSession("الله")), "ا");
});

test("a ligature keystroke is one keystroke, scored under the ligature key", () => {
  const typed = applyKey(applyKey(createSession("ما لا"), "م", 0), "ا", 100);
  let state = applyKey(typed, " ", 200);
  state = applyKey(state, "ﻻ", 500);
  assert.equal(isComplete(state), true);
  assert.equal(state.keystrokes, 4);
  const last = state.records[state.records.length - 1];
  assert.deepEqual(last, { expected: "ﻻ", typed: "ﻻ", correct: true, latencyMs: 300, at: 500 });
  assert.deepEqual(
    state.records.map((r) => r.expected),
    ["م", "ا", " ", "ﻻ"],
  );
});

test("typing the ligature as two letters still works and scores each letter", () => {
  let state = applyKey(createSession("لا"), "ل", 0);
  assert.equal(expectedKey(state), "ا");
  state = applyKey(state, "ا", 200);
  assert.equal(isComplete(state), true);
  assert.deepEqual(
    state.records.map((r) => r.expected),
    ["ل", "ا"],
  );
});

test("a wrong key where a ligature is due is a miss on the ligature", () => {
  let state = applyKey(createSession("لا"), "م", 0);
  assert.equal(state.cursor, 0);
  assert.equal(state.records[0]?.expected, "ﻻ");
  state = applyKey(state, "ﻷ", 100);
  assert.equal(state.cursor, 0, "the wrong ligature does not advance");
  assert.equal(state.errors, 2);
  assert.equal(state.records[1]?.expected, "ﻻ");
  state = applyKey(state, "لا", 200);
  assert.equal(isComplete(state), true);
  assert.equal(state.outcomes[0], "corrected");
  assert.equal(state.outcomes[1], "corrected");
});

test("a break between keystrokes is left out of the elapsed time", () => {
  let state = createSession("ابت");
  state = applyKey(state, "ا", 0);
  state = applyKey(state, "ب", 500);
  state = applyKey(state, "ت", 500 + 10 * 60_000);
  const m = metrics(state);
  assert.equal(m.elapsedMs, 500 + 3000);
  assert.ok(m.cpm > 40, `cpm ${m.cpm} should not collapse after a break`);
});

test("the live clock stops while the typist is away", () => {
  let state = createSession("ابت");
  state = applyKey(state, "ا", 0);
  state = applyKey(state, "ب", 500);
  assert.equal(metrics(state, 1000).elapsedMs, 1000);
  assert.equal(metrics(state, 60_000).elapsedMs, 3500);
  assert.equal(metrics(state, 600_000).elapsedMs, 3500);
});

test("a session can start part-way, with the text before it already typed", () => {
  let state = createSession("ابت ثج", 4);
  assert.equal(state.cursor, 4);
  assert.equal(state.origin, 4);
  assert.deepEqual(state.outcomes, ["correct", "correct", "correct", "correct", "pending", "pending"]);
  state = applyKey(state, "ث", 0);
  state = applyKey(state, "ج", 60_000 / 120);
  assert.equal(isComplete(state), true);
  const m = metrics(state);
  assert.equal(m.typedChars, 2, "only what was typed in this session counts");
  assert.equal(m.cpm, 240);
});

test("active typing time between keystrokes leaves pauses out", () => {
  let state = createSession("ابتث");
  state = applyKey(state, "ا", 0);
  state = applyKey(state, "ب", 400);
  state = applyKey(state, "ت", 400 + 60_000);
  state = applyKey(state, "ث", 400 + 60_000 + 300);
  assert.equal(activeMsBetween(state, 0, 4), 400 + 3000 + 300);
  assert.equal(activeMsBetween(state, 2, 4), 3000 + 300);
  assert.equal(activeMsBetween(state, 0, 2), 400);
});
