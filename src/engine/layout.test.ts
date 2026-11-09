import assert from "node:assert/strict";
import { test } from "node:test";
import {
  CORE_HARAKAT,
  HARAKAT,
  LAYOUT_NAME,
  TYPEABLE,
  TYPEABLE_LETTERS,
  strokeFor,
} from "./layout.ts";

test("the layout has exactly the 36 letters of Arabic (101)", () => {
  assert.equal(TYPEABLE_LETTERS.length, 36);
  assert.ok(TYPEABLE_LETTERS.includes("ض"));
  assert.ok(TYPEABLE_LETTERS.includes("ة"));
  assert.ok(!TYPEABLE_LETTERS.includes("ﻻ"));
});

test("every letter has a stroke on the base or shift layer", () => {
  for (const letter of TYPEABLE_LETTERS) {
    assert.ok(strokeFor(letter) !== undefined, letter);
  }
});

test("harakat live on the shift layer", () => {
  assert.equal(strokeFor("َ")?.code, "KeyQ");
  assert.equal(strokeFor("َ")?.shift, true);
  assert.equal(strokeFor("ض")?.shift, false);
  assert.equal(LAYOUT_NAME, "Arabic (101)");
});

test("the typeable set covers letters, harakat, punctuation and space", () => {
  assert.ok(TYPEABLE.has("ا"));
  assert.ok(TYPEABLE.has("َ"));
  assert.ok(TYPEABLE.has("،"));
  assert.ok(TYPEABLE.has("؟"));
  assert.ok(TYPEABLE.has(" "));
  assert.ok(!TYPEABLE.has("ـ"));
  assert.ok(!TYPEABLE.has("ٰ"));
  for (const haraka of HARAKAT) {
    assert.ok(TYPEABLE.has(haraka));
  }
  for (const haraka of CORE_HARAKAT) {
    assert.ok(HARAKAT.has(haraka));
  }
});
