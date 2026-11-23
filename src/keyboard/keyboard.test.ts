import { expect, test } from "vitest";
import { fingerOf } from "./fingers.ts";
import { HOME_ROW_LETTERS, strokeFor, WIN101_CAPS } from "./layout101.ts";
import { expandLigature, isLigatureForm, LIGATURE_KEYS } from "./ligatures.ts";
import { isTypeable, MARKS, TYPEABLE_LETTERS, TYPEABLE_PUNCTUATION } from "./typeable.ts";

test("the table matches Microsoft's KBDA1 layout key by key", () => {
  const expected: Record<string, [string, string]> = {
    Backquote: ["ذ", "ّ"],
    Digit1: ["1", "!"],
    Digit2: ["2", "@"],
    Digit3: ["3", "#"],
    Digit4: ["4", "$"],
    Digit5: ["5", "%"],
    Digit6: ["6", "^"],
    Digit7: ["7", "&"],
    Digit8: ["8", "*"],
    Digit9: ["9", ")"],
    Digit0: ["0", "("],
    Minus: ["-", "_"],
    Equal: ["=", "+"],
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
    Backslash: ["\\", "|"],
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
    Space: [" ", " "],
  };
  expect(WIN101_CAPS.map((cap) => cap.code).sort()).toEqual(Object.keys(expected).sort());
  for (const [code, [base, shift]] of Object.entries(expected)) {
    const cap = WIN101_CAPS.find((candidate) => candidate.code === code);
    expect([cap?.base, cap?.shift], code).toEqual([base, shift]);
  }
});

test("a character is found on its key, with Shift when it needs it", () => {
  expect(strokeFor("ض")).toEqual({ code: "KeyQ", shift: false });
  expect(strokeFor("َ")).toEqual({ code: "KeyQ", shift: true });
  expect(strokeFor("أ")).toEqual({ code: "KeyH", shift: true });
  expect(strokeFor("ء")).toEqual({ code: "KeyX", shift: false });
  expect(strokeFor(" ")).toEqual({ code: "Space", shift: false });
  expect(strokeFor("1")).toEqual({ code: "Digit1", shift: false });
  expect(strokeFor("(")).toEqual({ code: "Digit0", shift: true });
  expect(strokeFor(")")).toEqual({ code: "Digit9", shift: true });
  expect(strokeFor("|")).toEqual({ code: "Backslash", shift: true });
  expect(strokeFor("h")).toBeUndefined();
  expect(strokeFor("")).toBeUndefined();
});

const LETTERS = "ء آ أ ؤ إ ئ ا ب ة ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ى ي".split(" ");
const OTHER = [..."1234567890-=!@#$%^&*)(_+", ..."‘÷×؛<>", ...'][،/:"\\|', ..."~}{’,.؟"];

test("the layout types exactly the 36 Arabic letters", () => {
  expect(LETTERS).toHaveLength(36);
  expect([...TYPEABLE_LETTERS].sort()).toEqual([...LETTERS].sort());
});

test("the layout types exactly the 8 marks", () => {
  expect([...MARKS].sort()).toEqual(["ً", "ٌ", "ٍ", "َ", "ُ", "ِ", "ّ", "ْ"]);
});

test("the layout types exactly 45 digits, punctuation marks and symbols", () => {
  expect(OTHER).toHaveLength(45);
  expect([...TYPEABLE_PUNCTUATION].sort()).toEqual([...OTHER].sort());
});

test("letters, marks, the other characters and the space are what can be asked for", () => {
  for (const char of [...LETTERS, ...OTHER, "َ", "ّ", "ٍ", " "]) {
    expect(isTypeable(char), char).toBe(true);
    expect(strokeFor(char), char).toBeDefined();
  }
});

test("what the layout has no key for, the tatweel and the ligature keys are never asked for", () => {
  for (const glyph of ["«", "»", "١", "ٱ", "٪", "h", "ٰ", "۝", "", "ـ", "ﻻ", "ﻷ", "ﻹ", "ﻵ"]) {
    expect(isTypeable(glyph), glyph).toBe(false);
  }
});

test("the four lam-alef keys stand for a lam followed by an alef", () => {
  expect(LIGATURE_KEYS).toEqual(
    new Map([
      ["لا", "ﻻ"],
      ["لأ", "ﻷ"],
      ["لإ", "ﻹ"],
      ["لآ", "ﻵ"],
    ]),
  );
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

test("the home row holds the ten letters of the keys A S D F G H J K L and Semicolon", () => {
  expect([...HOME_ROW_LETTERS].sort()).toEqual(["ا", "ب", "ت", "س", "ش", "ك", "ل", "م", "ن", "ي"]);
});

test("every key belongs to the finger that touch typing assigns it", () => {
  const zones: Record<string, string> = {
    "left pinky": "Backquote Digit1 KeyQ KeyA KeyZ",
    "left ring": "Digit2 KeyW KeyS KeyX",
    "left middle": "Digit3 KeyE KeyD KeyC",
    "left index": "Digit4 Digit5 KeyR KeyT KeyF KeyG KeyV KeyB",
    "right index": "Digit6 Digit7 KeyY KeyU KeyH KeyJ KeyN KeyM",
    "right middle": "Digit8 KeyI KeyK Comma",
    "right ring": "Digit9 KeyO KeyL Period",
    "right pinky": "Digit0 Minus Equal KeyP BracketLeft BracketRight Semicolon Quote Backslash Slash",
    "both thumb": "Space",
  };
  const assigned = Object.values(zones).flatMap((codes) => codes.split(" "));
  expect(assigned.sort()).toEqual(WIN101_CAPS.map((cap) => cap.code).sort());
  for (const [finger, codes] of Object.entries(zones)) {
    const [hand, digit] = finger.split(" ");
    for (const code of codes.split(" ")) {
      expect(fingerOf(code), code).toEqual({ hand, digit });
    }
  }
});

test("a key that is not on the layout has no finger", () => {
  expect(fingerOf("F13")).toBeUndefined();
});
