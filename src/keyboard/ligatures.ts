const FORMS: ReadonlyMap<string, string> = new Map([
  ["ﻻ", "لا"],
  ["ﻼ", "لا"],
  ["ﻹ", "لإ"],
  ["ﻺ", "لإ"],
  ["ﻷ", "لأ"],
  ["ﻸ", "لأ"],
  ["ﻵ", "لآ"],
  ["ﻶ", "لآ"],
]);

const KEY_FORMS = ["ﻻ", "ﻷ", "ﻹ", "ﻵ"];

export function isLigatureForm(char: string): boolean {
  return FORMS.has(char);
}

export function expandLigature(char: string): string {
  return FORMS.get(char) ?? char;
}

export const LIGATURE_KEYS: ReadonlyMap<string, string> = new Map(
  KEY_FORMS.map((form) => [expandLigature(form), form]),
);
