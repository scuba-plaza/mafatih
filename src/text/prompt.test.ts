import { expect, test } from "vitest";
import { DAGGER_ALEF, DAMMATAN, FATHA, HARAKAT, KASRA, SHADDA, TANWEEN } from "./arabic.ts";
import { buildPrompt, type Prompt } from "./prompt.ts";
import { requiredMarks } from "./vocalization.ts";

const NONE: ReadonlySet<string> = new Set();
const BASIC: ReadonlySet<string> = new Set(HARAKAT);
const ALL: ReadonlySet<string> = new Set([...HARAKAT, ...TANWEEN]);

function typed(prompt: Prompt): string {
  return prompt.units.map((unit) => unit.text).join("");
}

test("letters only asks for no marks, harakat for the five basic ones, full for all eight", () => {
  const unlocked = new Set([FATHA]);
  expect(requiredMarks("letters", unlocked)).toEqual(NONE);
  expect(requiredMarks("harakat", unlocked)).toEqual(BASIC);
  expect(requiredMarks("full", unlocked)).toEqual(ALL);
});

test("auto asks for exactly the marks unlocked so far", () => {
  expect(requiredMarks("auto", new Set())).toEqual(NONE);
  expect(requiredMarks("auto", new Set([FATHA, KASRA]))).toEqual(new Set([FATHA, KASRA]));
});

test("the text shown is never changed, whatever must be typed", () => {
  for (const required of [NONE, BASIC, ALL]) {
    expect(buildPrompt("كِتَابٌ", required).shown).toBe("كِتَابٌ");
  }
});

test("with no marks required only the letters are typed, though the marks stay on screen", () => {
  expect(typed(buildPrompt("كِتَابٌ", NONE))).toBe("كتاب");
});

test("with all marks required every character is typed", () => {
  expect(typed(buildPrompt("كِتَابٌ", ALL))).toBe("كِتَابٌ");
});

test("with the basic harakat required the tanween is shown but not typed", () => {
  expect(typed(buildPrompt("كِتَابٌ", BASIC))).toBe("كِتَاب");
  expect(typed(buildPrompt("كِتَابٌ", new Set([DAMMATAN])))).toBe("كتابٌ");
});

test("each unit records where its character sits in the text shown", () => {
  expect(buildPrompt("بَ ت", NONE).units).toEqual([
    { text: "ب", start: 0, end: 1 },
    { text: " ", start: 2, end: 3 },
    { text: "ت", start: 3, end: 4 },
  ]);
  expect(buildPrompt("بَ", ALL).units).toEqual([
    { text: "ب", start: 0, end: 1 },
    { text: FATHA, start: 1, end: 2 },
  ]);
});

test("a dagger alef is shown and never typed, even with every mark required", () => {
  const prompt = buildPrompt(`هَ${DAGGER_ALEF}ذَا`, ALL);
  expect(prompt.shown).toBe(`هَ${DAGGER_ALEF}ذَا`);
  expect(typed(prompt)).toBe("هَذَا");
});

test("characters the keyboard cannot type are shown and skipped", () => {
  const prompt = buildPrompt("ب۝١ a😀ت", ALL);
  expect(typed(prompt)).toBe("ب ت");
  expect(prompt.units.at(-1)).toEqual({ text: "ت", start: 7, end: 8 });
});

test("a text with nothing typeable has no units", () => {
  expect(buildPrompt("hello", ALL).units).toEqual([]);
  expect(buildPrompt("", NONE).units).toEqual([]);
  expect(buildPrompt(`${FATHA}${SHADDA}`, NONE).units).toEqual([]);
});

test("a lam followed by an alef is one unit, because one key types both", () => {
  expect(buildPrompt("لا", NONE).units).toEqual([{ text: "لا", start: 0, end: 2 }]);
  expect(typed(buildPrompt("الآن لأن لإ", NONE))).toBe("الآن لأن لإ");
  expect(buildPrompt("الآن لأن لإ", NONE).units.map((unit) => unit.text)).toEqual([
    "ا",
    "لآ",
    "ن",
    " ",
    "لأ",
    "ن",
    " ",
    "لإ",
  ]);
});

test("the lam-alef unit spans a mark between the two letters that is not typed", () => {
  expect(buildPrompt("لَا", NONE).units).toEqual([{ text: "لا", start: 0, end: 3 }]);
});

test("a mark that must be typed between lam and alef keeps them apart", () => {
  expect(buildPrompt("لَا", ALL).units.map((unit) => unit.text)).toEqual(["ل", FATHA, "ا"]);
});

test("a lam before any other letter stays a unit of its own", () => {
  expect(buildPrompt("لم ل", NONE).units.map((unit) => unit.text)).toEqual(["ل", "م", " ", "ل"]);
});

test("hard line breaks are kept with the prompt", () => {
  expect(buildPrompt("ب ت", NONE).breaks).toEqual([]);
  expect(buildPrompt("ب ت", NONE, [2]).breaks).toEqual([2]);
});
