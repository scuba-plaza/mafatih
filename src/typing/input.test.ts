import { expect, test } from "vitest";
import { FATHA } from "~/text/arabic.ts";
import { diffInput, INPUT_SENTINEL, type InputAction } from "./input.ts";

const BACKSPACE: InputAction = { kind: "key", key: { kind: "backspace" } };

function typed(char: string): InputAction {
  return { kind: "key", key: { kind: "char", char } };
}

function after(text: string): string {
  return `${INPUT_SENTINEL}${text}`;
}

test("the field always holds one invisible character, so Backspace has something to delete", () => {
  expect(INPUT_SENTINEL).toHaveLength(1);
  expect(INPUT_SENTINEL.codePointAt(0)).toBe(0x200b);
});

test("a character added to the field is one key", () => {
  expect(diffInput(after(""), after("ب"))).toEqual([typed("ب")]);
  expect(diffInput(after(""), after(" "))).toEqual([typed(" ")]);
  expect(diffInput(after(""), after(FATHA))).toEqual([typed(FATHA)]);
  expect(diffInput(after(""), after("١"))).toEqual([typed("١")]);
});

test("nothing changed is no key", () => {
  expect(diffInput(after(""), after(""))).toEqual([]);
  expect(diffInput(after("ب"), after("ب"))).toEqual([]);
});

test("the invisible character being deleted is a Backspace", () => {
  expect(diffInput(after(""), "")).toEqual([BACKSPACE]);
});

test("the Windows lam-alef key, which sends two letters at once, is one key", () => {
  expect(diffInput(after(""), after("لا"))).toEqual([typed("لا")]);
  expect(diffInput(after(""), after("لأ"))).toEqual([typed("لأ")]);
});

test("the Linux lam-alef key, which sends one presentation form, is the same key", () => {
  expect(diffInput(after(""), after("ﻻ"))).toEqual([typed("لا")]);
  expect(diffInput(after(""), after("ﻷ"))).toEqual([typed("لأ")]);
  expect(diffInput(after(""), after("ﻹ"))).toEqual([typed("لإ")]);
  expect(diffInput(after(""), after("ﻵ"))).toEqual([typed("لآ")]);
});

test("two characters arriving together are passed on, more than two are not typing", () => {
  expect(diffInput(after(""), after(`ب${FATHA}`))).toEqual([typed(`ب${FATHA}`)]);
  expect(diffInput(after(""), after("كتاب"))).toEqual([{ kind: "ignored" }]);
  expect(diffInput(after(""), after("بسم الله الرحمن الرحيم"))).toEqual([{ kind: "ignored" }]);
  expect(diffInput(after(""), after("ﻻﻻ"))).toEqual([{ kind: "ignored" }]);
});

test("a Latin letter means the keyboard is on the wrong layout, and is not a key", () => {
  expect(diffInput(after(""), after("a"))).toEqual([{ kind: "latin" }]);
  expect(diffInput(after(""), after("Q"))).toEqual([{ kind: "latin" }]);
  expect(diffInput(after(""), after("ab"))).toEqual([{ kind: "latin" }]);
});

test("a line break is not a key", () => {
  expect(diffInput(after(""), after("\n"))).toEqual([{ kind: "ignored" }]);
});

test("a phone keyboard that keeps building a word sends only its newest letter as a key", () => {
  expect(diffInput(after("ب"), after("بت"))).toEqual([typed("ت")]);
  expect(diffInput(after("بت"), after("بتن"))).toEqual([typed("ن")]);
});

test("a phone keyboard deleting from the word it is building is a Backspace per character", () => {
  expect(diffInput(after("بت"), after("ب"))).toEqual([BACKSPACE]);
  expect(diffInput(after("بتن"), after("ب"))).toEqual([BACKSPACE, BACKSPACE]);
  expect(diffInput(after("ب"), after(""))).toEqual([BACKSPACE]);
});

test("a letter replaced inside the word being built is a Backspace and then the new letter", () => {
  expect(diffInput(after("بت"), after("بن"))).toEqual([BACKSPACE, typed("ن")]);
});

test("a suggestion that rewrites the word being built is not typing", () => {
  expect(diffInput(after("بت"), after("بيت جميل"))).toEqual([{ kind: "ignored" }]);
});

test("characters outside the basic plane count as one character each", () => {
  expect(diffInput(after(""), after("😀"))).toEqual([typed("😀")]);
  expect(diffInput(after("😀"), after(""))).toEqual([BACKSPACE]);
});
