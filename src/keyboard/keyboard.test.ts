import { expect, test } from "vitest";
import { fingerOf } from "./fingers.ts";
import { HOME_ROW_LETTERS, reachOf, strokeFor, WIN101_CAPS } from "./layout101.ts";
import { expandLigature, isLigatureForm, LIGATURE_KEYS } from "./ligatures.ts";
import { isTypeable, MARKS, TYPEABLE_LETTERS, TYPEABLE_PUNCTUATION } from "./typeable.ts";

test("the table matches Microsoft's KBDA1 layout key by key", () => {
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
    const cap = WIN101_CAPS.find((candidate) => candidate.code === code);
    expect([cap?.base, cap?.shift], code).toEqual([base, shift]);
  }
});

test("the layout has unique key codes and a space bar", () => {
  const codes = WIN101_CAPS.map((cap) => cap.code);
  expect(new Set(codes).size).toBe(codes.length);
  expect(WIN101_CAPS.some((cap) => cap.code === "Space" && cap.base === " ")).toBe(true);
});

test("a character is found on its key, with Shift when it needs it", () => {
  expect(strokeFor("ض")).toEqual({ code: "KeyQ", shift: false });
  expect(strokeFor("َ")).toEqual({ code: "KeyQ", shift: true });
  expect(strokeFor("أ")).toEqual({ code: "KeyH", shift: true });
  expect(strokeFor("ء")).toEqual({ code: "KeyX", shift: false });
  expect(strokeFor(" ")).toEqual({ code: "Space", shift: false });
  expect(strokeFor("h")).toBeUndefined();
});

test("the layout types 36 letters, 8 marks, 45 other characters and the space", () => {
  expect(TYPEABLE_LETTERS).toHaveLength(36);
  expect(new Set(TYPEABLE_LETTERS).size).toBe(36);
  expect([...MARKS].sort()).toEqual(["ً", "ٌ", "ٍ", "َ", "ُ", "ِ", "ّ", "ْ"]);
  expect(TYPEABLE_PUNCTUATION).toHaveLength(45);
  expect(isTypeable(" ")).toBe(true);
});

test("every typeable character has a key", () => {
  for (const char of [...TYPEABLE_LETTERS, ...MARKS, ...TYPEABLE_PUNCTUATION, " "]) {
    expect(isTypeable(char), char).toBe(true);
    expect(strokeFor(char), char).toBeDefined();
  }
});

test("sentence punctuation, Latin digits and the typographic quotes are typeable", () => {
  for (const mark of [".", "،", ":", "؟", "؛", "!", ",", "1", "‘", "’", "×"]) {
    expect(isTypeable(mark), mark).toBe(true);
  }
});

test("what the layout has no key for is not typeable", () => {
  for (const glyph of ["«", "»", "١", "ٱ", "٪", "h", "ٰ", "۝", ""]) {
    expect(isTypeable(glyph), glyph).toBe(false);
  }
});

test("tatweel has a key but is never asked for, and the ligature keys are typed as their letters", () => {
  expect(WIN101_CAPS.some((cap) => cap.shift === "ـ")).toBe(true);
  expect(isTypeable("ـ")).toBe(false);
  for (const form of ["ﻻ", "ﻷ", "ﻹ", "ﻵ"]) {
    expect(isTypeable(form), form).toBe(false);
  }
});

test("every mark is on the Shift layer of its documented key", () => {
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
  for (const [mark, code] of expected) {
    expect(strokeFor(mark), mark).toEqual({ code, shift: true });
  }
});

test("the four lam-alef keys stand for a lam followed by an alef", () => {
  expect(strokeFor("ﻻ")).toEqual({ code: "KeyB", shift: false });
  expect(strokeFor("ﻷ")).toEqual({ code: "KeyG", shift: true });
  expect(strokeFor("ﻹ")).toEqual({ code: "KeyT", shift: true });
  expect(strokeFor("ﻵ")).toEqual({ code: "KeyB", shift: true });
  expect([...LIGATURE_KEYS]).toEqual(
    expect.arrayContaining([
      ["لا", "ﻻ"],
      ["لأ", "ﻷ"],
      ["لإ", "ﻹ"],
      ["لآ", "ﻵ"],
    ]),
  );
  expect(LIGATURE_KEYS.size).toBe(4);
});

test("a lam-alef presentation form expands to its two letters, anything else stays as it is", () => {
  expect(expandLigature("ﻻ")).toBe("لا");
  expect(expandLigature("ﻼ")).toBe("لا");
  expect(expandLigature("ﻷ")).toBe("لأ");
  expect(expandLigature("ﻹ")).toBe("لإ");
  expect(expandLigature("ﻵ")).toBe("لآ");
  expect(expandLigature("ب")).toBe("ب");
  expect(isLigatureForm("ﻻ")).toBe(true);
  expect(isLigatureForm("ﻶ")).toBe(true);
  expect(isLigatureForm("ل")).toBe(false);
});

test("the home row holds ten letters", () => {
  expect([...HOME_ROW_LETTERS].sort()).toEqual(["ا", "ب", "ت", "س", "ش", "ك", "ل", "م", "ن", "ي"]);
});

test("reach is zero on the home keys and grows with every stretch, row and Shift", () => {
  for (const letter of ["ش", "س", "ي", "ب", "ت", "ن", "م", "ك"]) {
    expect(reachOf(letter), letter).toBe(0);
  }
  expect(reachOf("ل")).toBe(0.5);
  expect(reachOf("ا")).toBe(0.5);
  expect(reachOf("و")).toBe(1);
  expect(reachOf("ة")).toBeLessThan(reachOf("ج"));
  expect(reachOf("أ")).toBe(1.5);
  expect(reachOf("َ")).toBe(2.5);
  expect(reachOf("ذ")).toBe(3);
  for (const letter of TYPEABLE_LETTERS) {
    expect(reachOf(letter), letter).toBeLessThanOrEqual(3);
  }
});

test("every key belongs to a finger", () => {
  for (const cap of WIN101_CAPS) {
    expect(fingerOf(cap.code), cap.code).toBeDefined();
  }
  expect(fingerOf("F13")).toBeUndefined();
});

test("each of the eight fingers rests on its own home key", () => {
  const resting = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyJ", "KeyK", "KeyL", "Semicolon"].map((code) => {
    const finger = fingerOf(code);
    return `${finger?.hand} ${finger?.digit}`;
  });
  expect(new Set(resting).size).toBe(8);
  expect(resting.every((name) => !name.includes("thumb") && !name.includes("undefined"))).toBe(true);
});

test("the index fingers take the two inner columns, the thumbs the space bar", () => {
  expect(fingerOf("KeyG")).toEqual({ hand: "left", digit: "index" });
  expect(fingerOf("KeyH")).toEqual({ hand: "right", digit: "index" });
  expect(fingerOf("Quote")).toEqual({ hand: "right", digit: "pinky" });
  expect(fingerOf("Space")).toEqual({ hand: "both", digit: "thumb" });
});
