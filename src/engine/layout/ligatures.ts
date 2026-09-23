export const LIGATURES: ReadonlyMap<string, string> = new Map([
  ["ﻻ", "لا"],
  ["ﻼ", "لا"],
  ["ﻹ", "لإ"],
  ["ﻺ", "لإ"],
  ["ﻷ", "لأ"],
  ["ﻸ", "لأ"],
  ["ﻵ", "لآ"],
  ["ﻶ", "لآ"],
]);

export function expandLigature(char: string): string {
  return LIGATURES.get(char) ?? char;
}

export function expandLigatures(text: string): string {
  let out = "";
  for (const char of text) {
    out += expandLigature(char);
  }
  return out;
}
