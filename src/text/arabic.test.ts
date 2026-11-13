import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { MARKS } from "~/keyboard/typeable.ts";
import {
  canonicalizeMarks,
  DAGGER_ALEF,
  DAMMA,
  DAMMATAN,
  FATHA,
  FATHATAN,
  HARAKAT,
  isFullyVocalized,
  isMark,
  KASRA,
  KASRATAN,
  SHADDA,
  SUKUN,
  skeleton,
  TANWEEN,
} from "./arabic.ts";

const ayat = readFileSync(new URL("../../data/quran-simple.txt", import.meta.url), "utf8")
  .split("\n")
  .filter((line) => line !== "" && !line.startsWith("#"))
  .map((line) => line.split("|")[2] ?? "");

test("the marks have their Unicode code points", () => {
  expect(
    [FATHATAN, DAMMATAN, KASRATAN, FATHA, DAMMA, KASRA, SHADDA, SUKUN, DAGGER_ALEF].map((mark) => mark.codePointAt(0)),
  ).toEqual([0x64b, 0x64c, 0x64d, 0x64e, 0x64f, 0x650, 0x651, 0x652, 0x670]);
});

function marks(...codePoints: number[]): string[] {
  return codePoints.map((codePoint) => String.fromCodePoint(codePoint));
}

test("the five basic harakat are fatha, damma, kasra, sukun and shadda; the tanween are the three doubled vowels", () => {
  expect(HARAKAT).toEqual(marks(0x64e, 0x64f, 0x650, 0x652, 0x651));
  expect(TANWEEN).toEqual(marks(0x64b, 0x64c, 0x64d));
});

test("the harakat and the tanween are together exactly the marks the keyboard types", () => {
  expect([...HARAKAT, ...TANWEEN].sort()).toEqual([...MARKS].sort());
});

test("a string is a mark only when it is one single mark", () => {
  expect(isMark(FATHA)).toBe(true);
  expect(isMark(DAGGER_ALEF)).toBe(true);
  expect(isMark("ب")).toBe(false);
  expect(isMark(`ب${FATHA}`)).toBe(false);
  expect(isMark("")).toBe(false);
});

test("a shadda comes before the vowel it carries, whichever way the text was stored", () => {
  expect(canonicalizeMarks(`ب${FATHA}${SHADDA}`)).toBe(`ب${SHADDA}${FATHA}`);
  expect(canonicalizeMarks(`ب${SHADDA}${FATHA}`)).toBe(`ب${SHADDA}${FATHA}`);
  expect(canonicalizeMarks(`م${DAMMATAN}${SHADDA}`)).toBe(`م${SHADDA}${DAMMATAN}`);
  expect(canonicalizeMarks(`كُل${DAMMATAN}${SHADDA} شَي`)).toBe(`كُل${SHADDA}${DAMMATAN} شَي`);
});

test("a dagger alef ends its letter's marks", () => {
  expect(canonicalizeMarks(`م${DAGGER_ALEF}${FATHA}ن`)).toBe(`م${FATHA}${DAGGER_ALEF}ن`);
  expect(canonicalizeMarks(`ل${DAGGER_ALEF}${FATHA}${SHADDA}`)).toBe(`ل${SHADDA}${FATHA}${DAGGER_ALEF}`);
});

test("marks are only reordered within one letter, and other text is untouched", () => {
  expect(canonicalizeMarks("")).toBe("");
  expect(canonicalizeMarks("abc كتاب 12")).toBe("abc كتاب 12");
  expect(canonicalizeMarks(`${FATHA}${SHADDA}`)).toBe(`${SHADDA}${FATHA}`);
  expect(canonicalizeMarks(`ب${FATHA}ت${SHADDA}`)).toBe(`ب${FATHA}ت${SHADDA}`);
});

test("the Qur'an text is already in canonical order, so it is never changed", () => {
  expect(ayat).toHaveLength(6236);
  expect(ayat.filter((ayah) => canonicalizeMarks(ayah) !== ayah)).toEqual([]);
});

test("the skeleton of a text is the text without any marks", () => {
  expect(skeleton("كِتَابٌ")).toBe("كتاب");
  expect(skeleton(`ٱلرَّحْمَ${DAGGER_ALEF}نِ الرَّحِيمِ`)).toBe("ٱلرحمن الرحيم");
  expect(skeleton("abc")).toBe("abc");
  expect(skeleton("")).toBe("");
});

test("a word is fully vocalized when every letter carries a mark or is a long vowel", () => {
  for (const word of ["كِتَابٌ", "مِنْ", "بَيْتٌ", "يَكْتُبُ", "اِبْنٌ", "هُدًى", "آمَنَ", "فِي", "مَا", "ذُو", "كِتَابًا", "مَكَانٍ"]) {
    expect(isFullyVocalized(word), word).toBe(true);
  }
  expect(isFullyVocalized(`مَن${SHADDA}${FATHA}`)).toBe(true);
  expect(isFullyVocalized(`كُل${SHADDA}${DAMMATAN}`)).toBe(true);
});

test("a word with a bare letter, a lone shadda or no marks at all is not fully vocalized", () => {
  for (const word of ["كتاب", "كِتَاب", "بَيت", "مِن", "ا", "وَلد", ""]) {
    expect(isFullyVocalized(word), word).toBe(false);
  }
  expect(isFullyVocalized(`مَن${SHADDA}`)).toBe(false);
});

test("a letter carries at most one shadda and exactly one vowel, tanween or sukun, shadda first", () => {
  expect(isFullyVocalized(`ب${FATHA}${SUKUN}`)).toBe(false);
  expect(isFullyVocalized(`ب${FATHA}${DAMMA}`)).toBe(false);
  expect(isFullyVocalized(`ب${FATHA}${FATHA}`)).toBe(false);
  expect(isFullyVocalized(`ب${FATHATAN}${FATHATAN}`)).toBe(false);
  expect(isFullyVocalized(`مَن${SHADDA}${SHADDA}${FATHA}`)).toBe(false);
  expect(isFullyVocalized(`مَن${FATHA}${SHADDA}`)).toBe(false);
  expect(isFullyVocalized(`مَن${SHADDA}${FATHA}`)).toBe(true);
});

test("a word starts with a letter that carries a vowel, not with a mark, a sukun or a shadda", () => {
  expect(isFullyVocalized(`${SUKUN}بَ`)).toBe(false);
  expect(isFullyVocalized(`${SHADDA}${FATHA}بَ`)).toBe(false);
  expect(isFullyVocalized(`ب${SUKUN}نَ`)).toBe(false);
  expect(isFullyVocalized(`ب${SHADDA}${FATHA}نَ`)).toBe(false);
});

test("tanween only ends a word, optionally followed by its silent alef or alef maksura", () => {
  expect(isFullyVocalized("بًبَ")).toBe(false);
  expect(isFullyVocalized("بٌبَا")).toBe(false);
  expect(isFullyVocalized("كِتَابًا")).toBe(true);
  expect(isFullyVocalized("هُدًى")).toBe(true);
  expect(isFullyVocalized("كِتَابٍ")).toBe(true);
});

test("a teh marbuta only ends a word and an alef madda carries no mark", () => {
  expect(isFullyVocalized("مَدْرَسَةٌ")).toBe(true);
  expect(isFullyVocalized("ةٌ")).toBe(false);
  expect(isFullyVocalized("مَةَبٌ")).toBe(false);
  expect(isFullyVocalized(`آ${FATHA}مَنَ`)).toBe(false);
});

test("forms outside the practice word list's scope are rejected rather than guessed at", () => {
  for (const word of ["كَتَبُوا", "الْكِتَابُ", "الشَّمْسُ", "عَمْرٌو", "مِائَةٌ"]) {
    expect(isFullyVocalized(word), word).toBe(false);
  }
});

test("a long vowel letter only counts after the vowel it lengthens", () => {
  expect(isFullyVocalized("بُا")).toBe(false);
  expect(isFullyVocalized("بَو")).toBe(false);
  expect(isFullyVocalized("بَي")).toBe(false);
  expect(isFullyVocalized("بِى")).toBe(false);
  expect(isFullyVocalized("بَى")).toBe(true);
});

test("a word with anything the keyboard cannot type is not fully vocalized", () => {
  expect(isFullyVocalized(`هَ${DAGGER_ALEF}ذَا`)).toBe(false);
  expect(isFullyVocalized("كِتَابٌ!")).toBe(false);
  expect(isFullyVocalized("كِتَابٌ بَيْتٌ")).toBe(false);
  expect(isFullyVocalized("kitab")).toBe(false);
  expect(isFullyVocalized("كِتَـابٌ")).toBe(false);
});
