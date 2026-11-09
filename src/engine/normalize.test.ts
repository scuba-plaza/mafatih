import assert from "node:assert/strict";
import { test } from "node:test";
import { hasHaraka, normalizeText, skeleton, stripToTier, untypeableChars } from "./normalize.ts";

test("normalisation drops the dagger alef, yielding the modern spelling", () => {
  assert.equal(normalizeText("هَٰذَا"), "هَذَا");
  assert.equal(normalizeText("عَلَىٰ"), "عَلَى");
  assert.equal(normalizeText("ذَٰلِكَ"), "ذَلِكَ");
});

test("normalisation keeps every typeable character and drops the rest", () => {
  assert.equal(normalizeText("مَا أَنْزَلَ"), "مَا أَنْزَلَ");
  assert.equal(normalizeText("كِتَابٌ وَقُرْآنٌ"), "كِتَابٌ وَقُرْآنٌ");
  assert.deepEqual(untypeableChars("مَا۟ حَمَدٌ ـطَوِيلٌ"), ["۟", "ـ"]);
});

test("normalisation expands lam-alef ligatures and collapses repeated spaces", () => {
  assert.equal(normalizeText("ﻻ ﻹ ﻷ ﻵ"), "لا لإ لأ لآ");
  assert.equal(normalizeText("اَلْـ  بَيْت"), "اَلْ بَيْت");
});

test("tier stripping removes harakat progressively", () => {
  const full = "مُحَمَّدٌ كِتَابٌ";
  assert.equal(stripToTier(full, "full"), full);
  assert.equal(stripToTier(full, "core"), "مُحَمَّدٌ كِتَابٌ".replaceAll("ٌ", ""));
  assert.equal(stripToTier(full, "none"), "محمد كتاب");
  assert.equal(skeleton(full), "محمد كتاب");
});

test("hasHaraka detects vocalisation", () => {
  assert.ok(hasHaraka("مَا"));
  assert.ok(!hasHaraka("ما"));
});
