import assert from "node:assert/strict";
import { test } from "node:test";
import { composeDrill, lettersOf } from "./drills.ts";

const WORDS = ["بَيْتٌ", "بَابٌ", "كِتَابٌ", "قَلَمٌ", "شَمْسٌ"];
const UNLOCKED = new Set(["ب", "ي", "ت", "ك", "ا", "ق", "ل", "م"]);
const RAND = () => 0.5;

test("letters of a word are its skeleton, deduplicated", () => {
  assert.deepEqual(lettersOf("بَيْتٌ"), ["ب", "ي", "ت"]);
});

test("a drill uses only unlocked letters", () => {
  const drill = composeDrill({
    words: WORDS,
    unlocked: UNLOCKED,
    tier: "none",
    focus: "ب",
    count: 6,
    rand: RAND,
  });
  assert.ok(drill.length > 0);
  for (const word of drill.split(" ")) {
    for (const letter of lettersOf(word)) {
      assert.ok(UNLOCKED.has(letter), `${word} needs ${letter}`);
    }
  }
});

test("a drill at the none tier strips harakat", () => {
  const drill = composeDrill({
    words: ["بَيْتٌ"],
    unlocked: UNLOCKED,
    tier: "none",
    focus: "ب",
    count: 3,
    rand: RAND,
  });
  assert.equal(drill, "بيت بيت بيت");
});

test("a drill at the full tier keeps tanween, so it differs from core", () => {
  const full = composeDrill({ words: WORDS, unlocked: UNLOCKED, tier: "full", focus: "ب", count: 8, rand: RAND });
  const core = composeDrill({ words: WORDS, unlocked: UNLOCKED, tier: "core", focus: "ب", count: 8, rand: RAND });
  assert.ok(full.includes("ٌ"), full);
  assert.ok(!core.includes("ٌ"), core);
  assert.notEqual(full, core);
});

test("with no matching words the drill falls back to the unlocked letters", () => {
  const drill = composeDrill({
    words: WORDS,
    unlocked: new Set(["ش"]),
    tier: "none",
    focus: "ش",
    count: 5,
    rand: RAND,
  });
  assert.equal(drill, "ششش ششش ششش ششش ششش");
});

test("with only one unlocked letter the drill falls back to letter patterns", () => {
  const drill = composeDrill({
    words: WORDS,
    unlocked: new Set(["ب"]),
    tier: "none",
    focus: "ب",
    count: 5,
    rand: RAND,
  });
  assert.notEqual(drill, "");
  const parts = drill.split(" ");
  assert.equal(parts.length, 5);
  for (const part of parts) {
    assert.ok(part.length >= 2, part);
    for (const letter of part) {
      assert.equal(letter, "ب");
    }
  }
});

test("the fallback uses several unlocked letters when available", () => {
  let n = 0;
  const drill = composeDrill({
    words: ["ظَّ", "غَيْنٌ"],
    unlocked: new Set(["ب", "ت", "ن"]),
    tier: "none",
    focus: "ن",
    count: 6,
    rand: () => (n++ % 7) / 7,
  });
  const letters = new Set(drill.replaceAll(" ", ""));
  assert.ok(letters.has("ن"));
  for (const letter of letters) {
    assert.ok(["ب", "ت", "ن"].includes(letter), letter);
  }
});
