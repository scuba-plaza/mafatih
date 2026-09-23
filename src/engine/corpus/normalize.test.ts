import assert from "node:assert/strict";
import { test } from "node:test";
import { isTypeable, normalizeText, skeleton, stripToTier, untypeableChars } from "~/engine/corpus/normalize.ts";
import { TYPEABLE } from "~/engine/layout/ara.ts";

const DAGGER = "ٰ";
const WASLA = "ٱ";
const TATWEEL = "ـ";
const SMALL_HIGH_MEEM = "ۢ";
const WAQF_SALI = "ۖ";
const RUB_EL_HIZB = "۞";

test("drops the dagger alef and yields standard modern spelling", () => {
  const pairs: [string, string][] = [
    [`عَل${DAGGER}ى`, "عَلى"],
    [`ذ${DAGGER}لِكَ`, "ذلِكَ"],
    [`ه${DAGGER}ذَا`, "هذَا"],
    [`الرَّحْم${DAGGER}نِ`, "الرَّحْمنِ"],
  ];
  for (const [input, expected] of pairs) {
    assert.equal(normalizeText(input), expected);
    assert.ok(!normalizeText(input).includes(DAGGER));
  }
});

test("strips the uthmani recitation apparatus", () => {
  const noisy = `ب${WAQF_SALI}سْمِ${RUB_EL_HIZB} ${WASLA}للَّهِ${SMALL_HIGH_MEEM} الرَّح${TATWEEL}يمِ`;
  const out = normalizeText(noisy);
  assert.equal(out, "بسْمِ للَّهِ الرَّحيمِ");
  assert.ok(isTypeable(out));
  assert.deepEqual(untypeableChars(out), []);
});

test("whitelist keeps Arabic and its punctuation but rejects the rest", () => {
  const out = normalizeText("مرحبا hello ١٢٣ ، . ؟");
  for (const char of out) {
    assert.ok(TYPEABLE.has(char), `unexpected char ${JSON.stringify(char)}`);
  }
  assert.equal(out, "مرحبا ، . ؟");
});

test("decomposes lam-alef presentation forms", () => {
  assert.equal(normalizeText("ﻻ"), "لا");
  assert.equal(normalizeText("ﻹ"), "لإ");
  assert.equal(normalizeText("ﻷ"), "لأ");
  assert.equal(normalizeText("ﻵ"), "لآ");
});

test("NFC composes a bare hamza above onto its carrier", () => {
  assert.equal(normalizeText("أ"), "أ");
});

test("collapses whitespace introduced by dropped characters", () => {
  assert.equal(normalizeText("  الحمد    لله  "), "الحمد لله");
});

test("tier stripping removes the right marks", () => {
  const full = "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ";
  assert.equal(stripToTier(full, "full"), full);
  assert.equal(stripToTier(full, "none"), "الحمد لله رب العالمين");

  const core = stripToTier(full, "core");
  assert.ok(core.includes("َ"));
  assert.ok(core.includes("ّ"));
  for (const tanween of ["ً", "ٌ", "ٍ"]) {
    assert.ok(!core.includes(tanween));
  }
});

test("tier none equals the skeleton", () => {
  const full = "الْحَمْدُ لِلَّهِ";
  assert.equal(stripToTier(full, "none"), skeleton(full));
});
