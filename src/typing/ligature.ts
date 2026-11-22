import { isMark } from "~/text/arabic.ts";
import { isWordSpace } from "~/text/prompt.ts";

export interface LigatureWord {
  readonly start: number;
  readonly end: number;
  readonly lam: number;
  readonly alef: number;
}

const LAM = "ل";
const ALEF_FORMS: ReadonlySet<string> = new Set(["ا", "آ", "أ", "إ"]);

function baseBefore(text: string, offset: number, from: number): number {
  let index = offset - 1;
  while (index >= from && isMark(text.charAt(index))) {
    index -= 1;
  }
  return index;
}

function baseAfter(text: string, offset: number, to: number): number {
  let index = offset;
  while (index < to && isMark(text.charAt(index))) {
    index += 1;
  }
  return index;
}

export function ligatureWordAt(text: string, offset: number, from: number, to: number): LigatureWord | null {
  if (offset <= from || offset >= to) {
    return null;
  }
  const lam = baseBefore(text, offset, from);
  const alef = baseAfter(text, offset, to);
  if (lam < from || alef >= to || text.charAt(lam) !== LAM || !ALEF_FORMS.has(text.charAt(alef))) {
    return null;
  }
  let start = lam;
  while (start > from && !isWordSpace(text.charAt(start - 1))) {
    start -= 1;
  }
  let end = alef + 1;
  while (end < to && !isWordSpace(text.charAt(end))) {
    end += 1;
  }
  return { start, end, lam, alef };
}
