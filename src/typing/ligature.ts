import { isMark } from "~/text/arabic.ts";

export interface Ligature {
  readonly start: number;
  readonly end: number;
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

export function ligatureAt(text: string, offset: number, from: number, to: number): Ligature | null {
  if (offset <= from || offset >= to) {
    return null;
  }
  const lam = baseBefore(text, offset, from);
  const alef = baseAfter(text, offset, to);
  if (lam < from || alef >= to || text.charAt(lam) !== LAM || !ALEF_FORMS.has(text.charAt(alef))) {
    return null;
  }
  return { start: lam, end: baseAfter(text, alef + 1, to), alef };
}
