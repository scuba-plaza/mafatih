import { WIN101_CAPS } from "./layout101.ts";
import { isLigatureForm } from "./ligatures.ts";

const TATWEEL = "ـ";
const LETTER = /^[\u0621-\u064A]$/;
const MARK = /^[\u064B-\u0652]$/;

const GLYPHS: readonly string[] = [...new Set(WIN101_CAPS.flatMap((cap) => [cap.base, cap.shift]))].filter(
  (glyph) => glyph !== TATWEEL && !isLigatureForm(glyph),
);

export const TYPEABLE_LETTERS: readonly string[] = GLYPHS.filter((glyph) => LETTER.test(glyph));

export const MARKS: readonly string[] = GLYPHS.filter((glyph) => MARK.test(glyph));

export const TYPEABLE_PUNCTUATION: readonly string[] = GLYPHS.filter(
  (glyph) => glyph !== " " && !LETTER.test(glyph) && !MARK.test(glyph),
);

const TYPEABLE: ReadonlySet<string> = new Set(GLYPHS);

export function isTypeable(char: string): boolean {
  return TYPEABLE.has(char);
}
