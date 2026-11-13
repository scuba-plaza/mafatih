import { expect, test } from "vitest";
import { FATHA, SHADDA } from "~/text/arabic.ts";
import { diffInput, type InputChange, INPUT_SENTINEL as Z } from "./input.ts";
import type { Key } from "./session.ts";

const BACKSPACE: Key = { kind: "backspace" };
const NOTHING: InputChange = { keys: [], wrongLayout: false };
const WRONG_LAYOUT: InputChange = { keys: [], wrongLayout: true };

const NBSP = String.fromCodePoint(0xa0);
const TAB = String.fromCodePoint(0x9);
const ZWNJ = String.fromCodePoint(0x200c);
const ZWJ = String.fromCodePoint(0x200d);
const LONE_SURROGATE = String.fromCharCode(0xd83d);

function keys(...chars: string[]): InputChange {
  return { keys: chars.map((char) => (char === "<" ? BACKSPACE : { kind: "char", char })), wrongLayout: false };
}

test("a character added to the field is one key", () => {
  expect(diffInput(Z, `${Z}ب`)).toEqual(keys("ب"));
  expect(diffInput(Z, `${Z} `)).toEqual(keys(" "));
  expect(diffInput(Z, `${Z}${FATHA}`)).toEqual(keys(FATHA));
});

test("the tatweel, which an Arabic keyboard types with Shift and J, is a key and not a foreign letter", () => {
  const tatweel = String.fromCodePoint(0x640);
  expect(diffInput(Z, `${Z}${tatweel}`)).toEqual(keys(tatweel));
});

test("digits and punctuation are keys, whatever script they come from", () => {
  for (const char of ["1", ".", "،", "؟", "١", "!"]) {
    expect(diffInput(Z, `${Z}${char}`), char).toEqual(keys(char));
  }
});

test("nothing changed is nothing typed, and the same change always reads the same", () => {
  expect(diffInput(Z, Z)).toEqual(NOTHING);
  expect(diffInput(`${Z}ب`, `${Z}ب`)).toEqual(NOTHING);
  expect(diffInput("", "")).toEqual(NOTHING);
  expect(diffInput(Z, `${Z}ب`)).toEqual(diffInput(Z, `${Z}ب`));
});

test("the placeholder being deleted from an otherwise empty field is a Backspace", () => {
  expect(diffInput(Z, "")).toEqual(keys("<"));
});

test("the placeholder is never text: wherever the caret was, only the visible change counts", () => {
  expect(diffInput(Z, `ب${Z}`)).toEqual(keys("ب"));
  expect(diffInput(Z, "ب")).toEqual(keys("ب"));
  expect(diffInput(Z, "لا")).toEqual(keys("لا"));
  expect(diffInput(`${Z}ب`, "بت")).toEqual(keys("ت"));
  expect(diffInput(`${Z}ب`, "ب")).toEqual(NOTHING);
  expect(diffInput("ب", "بت")).toEqual(keys("ت"));
});

test("the placeholder coming back or doubling is nothing typed", () => {
  expect(diffInput("", Z)).toEqual(NOTHING);
  expect(diffInput(Z, `${Z}${Z}`)).toEqual(NOTHING);
});

test("the Windows lam-alef key, which sends two letters at once, is one key", () => {
  expect(diffInput(Z, `${Z}لا`)).toEqual(keys("لا"));
  expect(diffInput(Z, `${Z}لأ`)).toEqual(keys("لأ"));
});

test("the Linux lam-alef key, which sends one presentation form, is the same key", () => {
  expect(diffInput(Z, `${Z}ﻻ`)).toEqual(keys("لا"));
  expect(diffInput(Z, `${Z}ﻷ`)).toEqual(keys("لأ"));
  expect(diffInput(Z, `${Z}ﻹ`)).toEqual(keys("لإ"));
  expect(diffInput(Z, `${Z}ﻵ`)).toEqual(keys("لآ"));
});

test("anything longer than one key's worth is not typing: pasted, swiped, dictated or suggested text", () => {
  for (const text of [
    "كت",
    "كتاب",
    "بسم الله الرحمن الرحيم",
    "ﻻﻻ",
    "بﻻ",
    `ب${FATHA}`,
    `ب${SHADDA}${FATHA}`,
    "👨‍👩‍👧",
  ]) {
    expect(diffInput(Z, `${Z}${text}`), text).toEqual(NOTHING);
  }
});

test("a letter of another script means the keyboard is on the wrong layout, and is not a key", () => {
  for (const text of ["a", "Q", "ab", "é", "Ａ", "а", "α", "بa", "لاa"]) {
    expect(diffInput(Z, `${Z}${text}`), text).toEqual(WRONG_LAYOUT);
  }
});

test("a non-breaking space is a space", () => {
  expect(diffInput(Z, `${Z}${NBSP}`)).toEqual(keys(" "));
});

test("line breaks, tabs and invisible formatting characters are not keys", () => {
  for (const text of ["\n", "\r\n", "\r", TAB, ZWNJ, ZWJ, LONE_SURROGATE]) {
    expect(diffInput(Z, `${Z}${text}`), JSON.stringify(text)).toEqual(NOTHING);
  }
});

test("a character outside the basic plane is one key", () => {
  expect(diffInput(Z, `${Z}😀`)).toEqual(keys("😀"));
  expect(diffInput(`${Z}😀`, Z)).toEqual(keys("<"));
});

test("a phone keyboard that keeps building a word sends only its newest letter as a key", () => {
  expect(diffInput(`${Z}ب`, `${Z}بت`)).toEqual(keys("ت"));
  expect(diffInput(`${Z}بت`, `${Z}بتن`)).toEqual(keys("ن"));
});

test("a phone keyboard deleting from the word it is building is a Backspace per character", () => {
  expect(diffInput(`${Z}بت`, `${Z}ب`)).toEqual(keys("<"));
  expect(diffInput(`${Z}بتن`, `${Z}ب`)).toEqual(keys("<", "<"));
  expect(diffInput(`${Z}ب`, Z)).toEqual(keys("<"));
});

test("a letter replaced inside the word being built is a Backspace and then the new letter", () => {
  expect(diffInput(`${Z}بت`, `${Z}بن`)).toEqual(keys("<", "ن"));
});

test("what was deleted always reaches the engine, even when what replaced it is not typing", () => {
  expect(diffInput(`${Z}بت`, `${Z}بيت جميل`)).toEqual(keys("<"));
  expect(diffInput(`${Z}بتن`, `${Z}كتاب`)).toEqual(keys("<", "<", "<"));
  expect(diffInput(`${Z}بتن`, `${Z}كت`)).toEqual(keys("<", "<", "<"));
  expect(diffInput(`${Z}بت`, `${Z}بنت`)).toEqual(keys("<"));
  expect(diffInput(`${Z}بت`, `${Z}بa`)).toEqual({ keys: [BACKSPACE], wrongLayout: true });
});
