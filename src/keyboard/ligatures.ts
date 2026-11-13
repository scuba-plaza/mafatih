import { WIN101_CAPS } from "./layout101.ts";

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

export function isLigatureForm(char: string): boolean {
  return FORMS.has(char);
}

export function expandLigature(char: string): string {
  return FORMS.get(char) ?? char;
}

export const LIGATURE_KEYS: ReadonlyMap<string, string> = new Map(
  WIN101_CAPS.flatMap((cap) => [cap.base, cap.shift])
    .filter(isLigatureForm)
    .map((form) => [expandLigature(form), form]),
);
