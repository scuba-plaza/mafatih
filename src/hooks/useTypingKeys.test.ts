import assert from "node:assert/strict";
import { test } from "node:test";
import { capturesKeys, charsOf } from "~/hooks/useTypingKeys.ts";

test("captures keys while typing with no target", () => {
  assert.equal(capturesKeys(true, null), true);
});

test("ignores keys while not typing", () => {
  assert.equal(capturesKeys(false, null), false);
});

test("ignores keys aimed at form fields", () => {
  assert.equal(capturesKeys(true, { tag: "INPUT", typingInput: false }), false);
  assert.equal(capturesKeys(true, { tag: "SELECT", typingInput: false }), false);
  assert.equal(capturesKeys(true, { tag: "TEXTAREA", typingInput: false }), false);
  assert.equal(capturesKeys(true, { tag: "BUTTON", typingInput: false }), false);
});

test("captures keys aimed at plain elements", () => {
  assert.equal(capturesKeys(true, { tag: "BODY", typingInput: false }), true);
  assert.equal(capturesKeys(true, { tag: "DIV", typingInput: false }), true);
});

test("ignores keydown chars from the hidden typing input — scored via input events instead", () => {
  assert.equal(capturesKeys(true, { tag: "INPUT", typingInput: true }), false);
});

test("charsOf splits IME input data into characters", () => {
  assert.deepEqual(charsOf(null), []);
  assert.deepEqual(charsOf(undefined), []);
  assert.deepEqual(charsOf("ب"), ["ب"]);
  assert.deepEqual(charsOf("بب"), ["ب", "ب"]);
  assert.deepEqual(charsOf("بَ"), ["ب", "َ"]);
});
