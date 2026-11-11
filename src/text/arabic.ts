import { isTypeable } from "~/keyboard/typeable.ts";

export const FATHATAN = "\u064B";
export const DAMMATAN = "\u064C";
export const KASRATAN = "\u064D";
export const FATHA = "\u064E";
export const DAMMA = "\u064F";
export const KASRA = "\u0650";
export const SHADDA = "\u0651";
export const SUKUN = "\u0652";
export const DAGGER_ALEF = "\u0670";

export const HARAKAT: readonly string[] = [FATHA, DAMMA, KASRA, SUKUN, SHADDA];
export const TANWEEN: readonly string[] = [FATHATAN, DAMMATAN, KASRATAN];

const ALEF = "\u0627";
const ALEF_MADDA = "\u0622";
const WAW = "\u0648";
const YEH = "\u064A";
const ALEF_MAKSURA = "\u0649";

const MARK = /[\u064B-\u065F\u0670]/;
const MARK_RUN = /[\u064B-\u065F\u0670]+/g;
const WORD = /^[\u0621-\u063A\u0641-\u064A\u064B-\u0652]+$/;
const CLUSTER = /([\u0621-\u064A])([\u064B-\u0652]*)/g;

const LENGTHENED_BY: Readonly<Record<string, readonly string[]>> = {
  [ALEF]: [FATHA, FATHATAN],
  [WAW]: [DAMMA],
  [YEH]: [KASRA],
  [ALEF_MAKSURA]: [FATHA, FATHATAN],
};

function rank(mark: string): number {
  if (mark === SHADDA) {
    return 0;
  }
  if (mark === SUKUN) {
    return 2;
  }
  return mark === DAGGER_ALEF ? 3 : 1;
}

export function isMark(char: string): boolean {
  return MARK.test(char);
}

export function canonicalizeMarks(text: string): string {
  return text.replace(MARK_RUN, (run) => [...run].sort((a, b) => rank(a) - rank(b)).join(""));
}

export function skeleton(text: string): string {
  return text.replace(MARK_RUN, "");
}

export function isFullyVocalized(word: string): boolean {
  if (!WORD.test(word) || ![...word].every(isTypeable)) {
    return false;
  }
  let previous = "";
  for (const [, letter = "", marks = ""] of word.matchAll(CLUSTER)) {
    const voiced = marks.replace(SHADDA, "") !== "";
    const lengthens = marks === "" && (LENGTHENED_BY[letter] ?? []).some((vowel) => previous.includes(vowel));
    if (!voiced && !lengthens && letter !== ALEF_MADDA) {
      return false;
    }
    previous = marks;
  }
  return true;
}
