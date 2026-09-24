import assert from "node:assert/strict";
import { test } from "node:test";
import { WIN101_CAPS } from "~/engine/layout/ara.ts";
import { fingerName, fingerOf, HOME_KEYS, sameFinger } from "~/engine/layout/fingers.ts";

test("every key on Arabic (101) belongs to exactly one finger", () => {
  for (const cap of WIN101_CAPS) {
    assert.ok(fingerOf(cap.code), `${cap.code} has no finger`);
  }
});

test("each of the eight fingers rests on one home key", () => {
  const resting = [...HOME_KEYS].map((code) => {
    const finger = fingerOf(code);
    assert.ok(finger);
    return `${finger.hand} ${finger.digit}`;
  });
  assert.equal(new Set(resting).size, 8);
  assert.ok(resting.every((name) => !name.includes("thumb")));
});

test("the index fingers take the two inner columns, the thumbs the space bar", () => {
  assert.deepEqual(fingerOf("KeyG"), { hand: "left", digit: "index" });
  assert.deepEqual(fingerOf("KeyH"), { hand: "right", digit: "index" });
  assert.deepEqual(fingerOf("Quote"), { hand: "right", digit: "pinky" });
  assert.equal(fingerName({ hand: "left", digit: "ring" }), "Left ring");
  assert.equal(fingerName({ hand: "both", digit: "thumb" }), "Either thumb");
});

test("neighbouring keys share a finger only within a zone", () => {
  assert.equal(sameFinger(fingerOf("KeyF"), fingerOf("KeyG")), true);
  assert.equal(sameFinger(fingerOf("KeyG"), fingerOf("KeyH")), false);
  assert.equal(sameFinger(fingerOf("KeyD"), undefined), false);
});
