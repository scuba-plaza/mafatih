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

test("the five basic harakat and the three tanween are together exactly the marks the keyboard types", () => {
  expect(HARAKAT).toEqual([FATHA, DAMMA, KASRA, SUKUN, SHADDA]);
  expect(TANWEEN).toEqual([FATHATAN, DAMMATAN, KASRATAN]);
  expect([...HARAKAT, ...TANWEEN].sort()).toEqual([...MARKS].sort());
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
