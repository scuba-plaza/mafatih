import assert from "node:assert/strict";
import { test } from "node:test";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import {
  HARAKAT,
  reachOf,
  strokeFor,
  TATWEEL,
  TYPEABLE,
  TYPEABLE_LETTERS,
  TYPEABLE_PUNCTUATION,
  WIN101_CAPS,
} from "~/engine/layout/ara.ts";
import { expandLigatures, LIGATURES } from "~/engine/layout/ligatures.ts";

test("the typeable set is 36 letters, 8 harakat, what else Arabic (101) types, and space", () => {
  assert.equal(TYPEABLE_LETTERS.length, 36);
  assert.equal(HARAKAT.size, 8);
  assert.equal(TYPEABLE_PUNCTUATION.length, 45);
  assert.equal(TYPEABLE.size, 36 + 8 + 45 + 1);
  assert.ok(TYPEABLE.has(" "));
});

test("every typeable character has a key on Arabic (101)", () => {
  for (const char of TYPEABLE) {
    assert.ok(strokeFor(char), `Arabic (101) cannot produce ${JSON.stringify(char)}`);
  }
});

test("sentence punctuation, Latin digits and the typographic quotes are typeable", () => {
  for (const mark of [".", "،", ":", "؟", "؛", "!", ",", "1", "‘", "’", "×"]) {
    assert.ok(TYPEABLE.has(mark), `${mark} should be typeable`);
  }
});

test("what Arabic (101) has no key for is not typeable", () => {
  for (const glyph of ["«", "»", "١", "ٱ", "٪", "h"]) {
    assert.equal(strokeFor(glyph), undefined, `${glyph} has no key`);
    assert.ok(!TYPEABLE.has(glyph), `${glyph} should not be typeable`);
  }
});

test("tatweel has a key but is not a corpus character, and ligature keys are not characters", () => {
  assert.ok(WIN101_CAPS.some((cap) => cap.shift === TATWEEL));
  assert.ok(!TYPEABLE.has(TATWEEL));
  for (const form of LIGATURES.keys()) {
    assert.ok(!TYPEABLE.has(form), `${form} is typed as its letters`);
  }
});

test("every haraka needs shift", () => {
  for (const haraka of HARAKAT) {
    assert.equal(strokeFor(haraka)?.shift, true, `${haraka} should need shift`);
  }
});

test("Arabic (101) places the harakat on its documented keys", () => {
  const expected: [string, string][] = [
    ["َ", "KeyQ"],
    ["ً", "KeyW"],
    ["ُ", "KeyE"],
    ["ٌ", "KeyR"],
    ["ِ", "KeyA"],
    ["ٍ", "KeyS"],
    ["ْ", "KeyX"],
    ["ّ", "Backquote"],
  ];
  for (const [char, code] of expected) {
    assert.equal(strokeFor(char)?.code, code, `${char} should sit on ${code}`);
  }
});

test("the lam-alef ligature key types lam then alef", () => {
  const cap = WIN101_CAPS.find((k) => k.code === "KeyB");
  assert.equal(expandLigatures(cap?.base ?? ""), "لا");
  assert.equal(strokeFor("ﻻ")?.code, "KeyB");
});

test("the layout has unique key codes and a spacebar", () => {
  const codes = WIN101_CAPS.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(WIN101_CAPS.some((c) => c.code === "Space" && c.base === " "));
});

test("Arabic 101 matches Microsoft's KBDA1 table", () => {
  const expected: Record<string, [string, string]> = {
    Backquote: ["ذ", "ّ"],
    KeyQ: ["ض", "َ"],
    KeyW: ["ص", "ً"],
    KeyE: ["ث", "ُ"],
    KeyR: ["ق", "ٌ"],
    KeyT: ["ف", "ﻹ"],
    KeyY: ["غ", "إ"],
    KeyU: ["ع", "‘"],
    KeyI: ["ه", "÷"],
    KeyO: ["خ", "×"],
    KeyP: ["ح", "؛"],
    BracketLeft: ["ج", "<"],
    BracketRight: ["د", ">"],
    KeyA: ["ش", "ِ"],
    KeyS: ["س", "ٍ"],
    KeyD: ["ي", "]"],
    KeyF: ["ب", "["],
    KeyG: ["ل", "ﻷ"],
    KeyH: ["ا", "أ"],
    KeyJ: ["ت", "ـ"],
    KeyK: ["ن", "،"],
    KeyL: ["م", "/"],
    Semicolon: ["ك", ":"],
    Quote: ["ط", '"'],
    KeyZ: ["ئ", "~"],
    KeyX: ["ء", "ْ"],
    KeyC: ["ؤ", "}"],
    KeyV: ["ر", "{"],
    KeyB: ["ﻻ", "ﻵ"],
    KeyN: ["ى", "آ"],
    KeyM: ["ة", "’"],
    Comma: ["و", ","],
    Period: ["ز", "."],
    Slash: ["ظ", "؟"],
  };
  for (const [code, [base, shift]] of Object.entries(expected)) {
    const cap = WIN101_CAPS.find((c) => c.code === code);
    assert.deepEqual([cap?.base, cap?.shift], [base, shift], code);
  }
});

test("reach is zero on the home keys and grows with every stretch, row and shift", () => {
  for (const letter of ["ش", "س", "ي", "ب", "ت", "ن", "م", "ك"]) {
    assert.equal(reachOf(letter), 0, `${letter} rests under a finger`);
  }
  assert.ok(reachOf("ا") > 0 && reachOf("ا") < reachOf("و"), "alef is a short index stretch");
  assert.ok(reachOf("ة") < reachOf("ج"), "teh marbuta sits under the right index");
  assert.ok(reachOf("أ") > reachOf("ا"), "hamza above alef needs shift");
  for (const letter of TYPEABLE_LETTERS) {
    if (letter !== "ذ") {
      assert.ok(reachOf(letter) < reachOf("ذ") || reachOf(letter) >= 3, `${letter} is closer than thal`);
    }
  }
});

test("the letters unlock home row first, and far keys come late even when frequent", () => {
  const first = letterOrder.slice(0, 6);
  for (const letter of first) {
    assert.ok(reachOf(letter) <= 0.5, `${letter} should be on or beside the home row`);
  }
  assert.deepEqual([...first].sort(), ["ا", "ب", "ل", "م", "ن", "ي"].sort());
  assert.ok(letterOrder.indexOf("ذ") >= letterOrder.length - 5, "thal on the number row comes near the end");
  assert.ok(letterOrder.indexOf("ة") < letterOrder.indexOf("ذ"), "teh marbuta comes before thal");
  assert.ok(letterOrder.indexOf("ش") < letterOrder.indexOf("د"), "a home-row letter beats a far pinky reach");
  assert.equal(new Set(letterOrder).size, 36);
});
