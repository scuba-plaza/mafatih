import assert from "node:assert/strict";
import { test } from "node:test";
import { WIN101_CAPS } from "~/engine/layout/ara.ts";
import { fingerName, fingerOf } from "~/engine/layout/fingers.ts";

test("every key on Arabic (101) belongs to exactly one finger", () => {
  for (const cap of WIN101_CAPS) {
    assert.ok(fingerOf(cap.code), `${cap.code} has no finger`);
  }
});

test("each of the eight fingers rests on one home key", () => {
  const home = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"];
  const resting = home.map((code) => {
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
