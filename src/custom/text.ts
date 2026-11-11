import { expandLigature } from "~/keyboard/ligatures.ts";
import { canonicalizeMarks, isMark } from "~/text/arabic.ts";

export interface PreparedText {
  readonly text: string;
  readonly truncated: boolean;
}

export const CUSTOM_TEXT_LIMIT = 5000;

const LOW_SURROGATE = /[\uDC00-\uDFFF]/;

function splitsACharacter(text: string, at: number): boolean {
  const next = text.charAt(at);
  return isMark(next) || LOW_SURROGATE.test(next);
}

function cutToLimit(text: string): string {
  const head = text.slice(0, CUSTOM_TEXT_LIMIT);
  const lastSpace = head.lastIndexOf(" ");
  if (text.charAt(CUSTOM_TEXT_LIMIT) === " " || lastSpace < 0) {
    let end = CUSTOM_TEXT_LIMIT;
    while (end > 0 && splitsACharacter(text, end)) {
      end -= 1;
    }
    return text.slice(0, end);
  }
  return head.slice(0, lastSpace);
}

export function prepareCustomText(raw: string): PreparedText {
  const expanded = [...raw].map(expandLigature).join("");
  const text = canonicalizeMarks(expanded).replace(/\s+/g, " ").trim();
  return text.length > CUSTOM_TEXT_LIMIT ? { text: cutToLimit(text), truncated: true } : { text, truncated: false };
}
