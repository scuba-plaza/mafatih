import { KEY_GLYPHS } from "./layout101.ts";

const LETTER = /^[\u0621-\u064A]$/;
const MARK = /^[\u064B-\u0652]$/;

export const TYPEABLE_LETTERS: readonly string[] = KEY_GLYPHS.filter((glyph) => LETTER.test(glyph));

export const MARKS: readonly string[] = KEY_GLYPHS.filter((glyph) => MARK.test(glyph));

export const TYPEABLE_PUNCTUATION: readonly string[] = KEY_GLYPHS.filter(
  (glyph) => glyph !== " " && !LETTER.test(glyph) && !MARK.test(glyph),
);

const TYPEABLE: ReadonlySet<string> = new Set(KEY_GLYPHS);

export function isTypeable(char: string): boolean {
  return TYPEABLE.has(char);
}
