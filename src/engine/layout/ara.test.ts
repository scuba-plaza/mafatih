import assert from "node:assert/strict";
import { test } from "node:test";
import {
  capsOf,
  HARAKAT,
  LAYOUT_IDS,
  LAYOUTS,
  lettersOfLayout,
  MAC_CAPS,
  strokeFor,
  TATWEEL,
  TYPEABLE,
  TYPEABLE_LETTERS,
  TYPEABLE_PUNCTUATION,
  WIN101_CAPS,
} from "~/engine/layout/ara.ts";
import { expandLigatures } from "~/engine/layout/ligatures.ts";

test("the typeable set is 36 letters plus 8 harakat plus punctuation plus space", () => {
  assert.equal(TYPEABLE_LETTERS.length, 36);
  assert.equal(HARAKAT.size, 8);
  assert.equal(TYPEABLE_PUNCTUATION.length, 28);
  assert.equal(TYPEABLE.size, 36 + 8 + 28 + 1);
  assert.ok(TYPEABLE.has(" "));
});

test("sentence punctuation is typeable, because both layouts carry it", () => {
  for (const mark of [".", "،", ":", "؟", "؛", "!"]) {
    assert.ok(TYPEABLE.has(mark), `${mark} should be typeable`);
    for (const id of LAYOUT_IDS) {
      assert.ok(strokeFor(mark, id), `${LAYOUTS[id].name} cannot produce ${JSON.stringify(mark)}`);
    }
  }
});

test("a glyph only one layout carries is not typeable", () => {
  for (const glyph of [",", "‘", "~", "×", "1"]) {
    assert.ok(strokeFor(glyph, "win101"), `Arabic 101 should carry ${glyph}`);
    assert.equal(strokeFor(glyph, "mac"), undefined, `Macintosh should not carry ${glyph}`);
    assert.ok(!TYPEABLE.has(glyph), `${glyph} is not reachable on every layout`);
  }
  for (const glyph of ["«", "»", "١", "ٱ"]) {
    assert.ok(strokeFor(glyph, "mac"), `Macintosh should carry ${glyph}`);
    assert.equal(strokeFor(glyph, "win101"), undefined, `Arabic 101 should not carry ${glyph}`);
    assert.ok(!TYPEABLE.has(glyph), `${glyph} is not reachable on every layout`);
  }
});

test("both layouts reach every typeable character", () => {
  for (const id of LAYOUT_IDS) {
    for (const char of TYPEABLE) {
      assert.ok(strokeFor(char, id), `${LAYOUTS[id].name} cannot produce ${JSON.stringify(char)}`);
    }
  }
});

test("both layouts expose exactly the same Arabic letters", () => {
  const mac = [...lettersOfLayout("mac")].sort();
  const win = [...lettersOfLayout("win101")].sort();
  assert.deepEqual(mac, win);
  assert.equal(mac.length, 36);
});

test("tatweel is reachable on both layouts but is not a corpus letter", () => {
  assert.ok(WIN101_CAPS.some((cap) => cap.shift === TATWEEL));
  assert.ok(MAC_CAPS.some((cap) => cap.base === TATWEEL));
  assert.ok(!TYPEABLE.has(TATWEEL));
});

test("every haraka needs shift on both layouts", () => {
  for (const id of LAYOUT_IDS) {
    for (const haraka of HARAKAT) {
      assert.equal(strokeFor(haraka, id)?.shift, true, `${haraka} should need shift on ${id}`);
    }
  }
});

test("Arabic 101 places the harakat on its documented keys", () => {
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
    assert.equal(strokeFor(char, "win101")?.code, code, `${char} should sit on ${code}`);
  }
});

test("Arabic Macintosh gathers all eight harakat onto the top row", () => {
  const expected: [string, string][] = [
    ["َ", "KeyQ"],
    ["ً", "KeyW"],
    ["ِ", "KeyE"],
    ["ٍ", "KeyR"],
    ["ُ", "KeyT"],
    ["ٌ", "KeyY"],
    ["ْ", "KeyU"],
    ["ّ", "KeyI"],
  ];
  for (const [char, code] of expected) {
    const stroke = strokeFor(char, "mac");
    assert.equal(stroke?.code, code, `${char} should sit on ${code}`);
  }
  for (const haraka of HARAKAT) {
    const code = strokeFor(haraka, "mac")?.code;
    const cap = MAC_CAPS.find((c) => c.code === code);
    assert.equal(cap?.row, 1, `${haraka} should be on the top letter row`);
  }
});

test("Macintosh moves the hamza carriers onto the bottom row", () => {
  for (const [char, code] of [
    ["أ", "KeyB"],
    ["إ", "KeyN"],
    ["ؤ", "KeyM"],
    ["ئ", "KeyC"],
    ["ء", "KeyV"],
    ["آ", "KeyH"],
  ] as [string, string][]) {
    assert.equal(strokeFor(char, "mac")?.code, code);
  }
});

test("only Arabic 101 carries a lam-alef ligature key", () => {
  const win = WIN101_CAPS.find((k) => k.code === "KeyB");
  assert.equal(expandLigatures(win?.base ?? ""), "لا");
  assert.equal(strokeFor("ﻻ", "win101")?.code, "KeyB");
  assert.equal(strokeFor("ﻻ", "mac"), undefined, "the Macintosh layout has no ligature key");
});

test("layouts have unique key codes and a spacebar", () => {
  for (const id of LAYOUT_IDS) {
    const caps = capsOf(id);
    const codes = caps.map((c) => c.code);
    assert.equal(new Set(codes).size, codes.length, `${id} has duplicate key codes`);
    assert.ok(
      caps.some((c) => c.code === "Space" && c.base === " "),
      `${id} is missing a spacebar`,
    );
  }
});

test("strokeFor defaults to the Windows Arabic 101 layout", () => {
  assert.deepEqual(strokeFor("ّ"), strokeFor("ّ", "win101"));
  assert.equal(strokeFor("ّ")?.code, "Backquote");
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

test("only Arabic (101) and Arabic (Macintosh) are offered", () => {
  assert.deepEqual(LAYOUT_IDS, ["win101", "mac"]);
  assert.deepEqual(
    LAYOUT_IDS.map((id) => LAYOUTS[id].name),
    ["Arabic (101)", "Arabic (Macintosh)"],
  );
});
