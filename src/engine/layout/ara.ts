import { expandLigature, LIGATURES } from "~/engine/layout/ligatures.ts";

export interface KeyCap {
  code: string;
  base: string;
  shift: string;
  row: number;
}

export const WIN101_CAPS: readonly KeyCap[] = [
  { code: "Backquote", base: "ذ", shift: "ّ", row: 0 },
  { code: "Digit1", base: "1", shift: "!", row: 0 },
  { code: "Digit2", base: "2", shift: "@", row: 0 },
  { code: "Digit3", base: "3", shift: "#", row: 0 },
  { code: "Digit4", base: "4", shift: "$", row: 0 },
  { code: "Digit5", base: "5", shift: "%", row: 0 },
  { code: "Digit6", base: "6", shift: "^", row: 0 },
  { code: "Digit7", base: "7", shift: "&", row: 0 },
  { code: "Digit8", base: "8", shift: "*", row: 0 },
  { code: "Digit9", base: "9", shift: ")", row: 0 },
  { code: "Digit0", base: "0", shift: "(", row: 0 },
  { code: "Minus", base: "-", shift: "_", row: 0 },
  { code: "Equal", base: "=", shift: "+", row: 0 },

  { code: "KeyQ", base: "ض", shift: "َ", row: 1 },
  { code: "KeyW", base: "ص", shift: "ً", row: 1 },
  { code: "KeyE", base: "ث", shift: "ُ", row: 1 },
  { code: "KeyR", base: "ق", shift: "ٌ", row: 1 },
  { code: "KeyT", base: "ف", shift: "ﻹ", row: 1 },
  { code: "KeyY", base: "غ", shift: "إ", row: 1 },
  { code: "KeyU", base: "ع", shift: "‘", row: 1 },
  { code: "KeyI", base: "ه", shift: "÷", row: 1 },
  { code: "KeyO", base: "خ", shift: "×", row: 1 },
  { code: "KeyP", base: "ح", shift: "؛", row: 1 },
  { code: "BracketLeft", base: "ج", shift: "<", row: 1 },
  { code: "BracketRight", base: "د", shift: ">", row: 1 },

  { code: "KeyA", base: "ش", shift: "ِ", row: 2 },
  { code: "KeyS", base: "س", shift: "ٍ", row: 2 },
  { code: "KeyD", base: "ي", shift: "]", row: 2 },
  { code: "KeyF", base: "ب", shift: "[", row: 2 },
  { code: "KeyG", base: "ل", shift: "ﻷ", row: 2 },
  { code: "KeyH", base: "ا", shift: "أ", row: 2 },
  { code: "KeyJ", base: "ت", shift: "ـ", row: 2 },
  { code: "KeyK", base: "ن", shift: "،", row: 2 },
  { code: "KeyL", base: "م", shift: "/", row: 2 },
  { code: "Semicolon", base: "ك", shift: ":", row: 2 },
  { code: "Quote", base: "ط", shift: '"', row: 2 },
  { code: "Backslash", base: "\\", shift: "|", row: 2 },

  { code: "KeyZ", base: "ئ", shift: "~", row: 3 },
  { code: "KeyX", base: "ء", shift: "ْ", row: 3 },
  { code: "KeyC", base: "ؤ", shift: "}", row: 3 },
  { code: "KeyV", base: "ر", shift: "{", row: 3 },
  { code: "KeyB", base: "ﻻ", shift: "ﻵ", row: 3 },
  { code: "KeyN", base: "ى", shift: "آ", row: 3 },
  { code: "KeyM", base: "ة", shift: "’", row: 3 },
  { code: "Comma", base: "و", shift: ",", row: 3 },
  { code: "Period", base: "ز", shift: ".", row: 3 },
  { code: "Slash", base: "ظ", shift: "؟", row: 3 },

  { code: "Space", base: " ", shift: " ", row: 4 },
];

export const LAYOUT_NAME = "Arabic (101)";

const KEY_REACH: Readonly<Record<string, number>> = {
  Backquote: 3,
  KeyQ: 1.5,
  KeyW: 1,
  KeyE: 1,
  KeyR: 1,
  KeyT: 1.5,
  KeyY: 1.5,
  KeyU: 1,
  KeyI: 1,
  KeyO: 1,
  KeyP: 1.5,
  BracketLeft: 2,
  BracketRight: 2.5,
  KeyA: 0,
  KeyS: 0,
  KeyD: 0,
  KeyF: 0,
  KeyG: 0.5,
  KeyH: 0.5,
  KeyJ: 0,
  KeyK: 0,
  KeyL: 0,
  Semicolon: 0,
  Quote: 1,
  KeyZ: 1.5,
  KeyX: 1,
  KeyC: 1,
  KeyV: 1,
  KeyB: 1.5,
  KeyN: 1.5,
  KeyM: 1,
  Comma: 1,
  Period: 1,
  Slash: 1.5,
  Space: 0,
};

const FAR_REACH = 3;
const SHIFT_REACH = 1;

const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const FATHATAN = "ً";
const DAMMATAN = "ٌ";
const KASRATAN = "ٍ";

export const CORE_HARAKAT: ReadonlySet<string> = new Set([FATHA, DAMMA, KASRA, SUKUN, SHADDA]);
export const TANWEEN: ReadonlySet<string> = new Set([FATHATAN, DAMMATAN, KASRATAN]);
export const HARAKAT: ReadonlySet<string> = new Set([...CORE_HARAKAT, ...TANWEEN]);

export const TATWEEL = "ـ";

const ARABIC_LETTER = /^[ء-ي]$/;

const LIGATURE_FORMS: ReadonlySet<string> = new Set(LIGATURES.keys());

function glyphsOf(caps: readonly KeyCap[]): Set<string> {
  const seen = new Set<string>();
  for (const cap of caps) {
    for (const glyph of [cap.base, cap.shift]) {
      if (glyph !== "" && glyph !== TATWEEL && !LIGATURE_FORMS.has(glyph)) {
        seen.add(glyph);
      }
    }
  }
  return seen;
}

function lettersOf(caps: readonly KeyCap[]): string[] {
  return [...glyphsOf(caps)].filter((glyph) => ARABIC_LETTER.test(glyph));
}

export const TYPEABLE_LETTERS: readonly string[] = lettersOf(WIN101_CAPS);

export const TYPEABLE_PUNCTUATION: readonly string[] = [...glyphsOf(WIN101_CAPS)].filter(
  (glyph) => glyph !== " " && !ARABIC_LETTER.test(glyph) && !HARAKAT.has(glyph),
);

export const TYPEABLE: ReadonlySet<string> = new Set([...TYPEABLE_LETTERS, ...HARAKAT, ...TYPEABLE_PUNCTUATION, " "]);

export interface KeyStroke {
  code: string;
  shift: boolean;
}

function indexOf(caps: readonly KeyCap[]): ReadonlyMap<string, KeyStroke> {
  const map = new Map<string, KeyStroke>();
  for (const cap of caps) {
    if (cap.base !== "" && !map.has(cap.base)) {
      map.set(cap.base, { code: cap.code, shift: false });
    }
    if (cap.shift !== "" && !map.has(cap.shift)) {
      map.set(cap.shift, { code: cap.code, shift: true });
    }
  }
  return map;
}

const STROKE_INDEX: ReadonlyMap<string, KeyStroke> = indexOf(WIN101_CAPS);

export function strokeFor(char: string): KeyStroke | undefined {
  return STROKE_INDEX.get(char);
}

export function reachOf(char: string): number {
  const stroke = strokeFor(char);
  if (stroke === undefined) {
    return FAR_REACH + SHIFT_REACH;
  }
  return (KEY_REACH[stroke.code] ?? FAR_REACH) + (stroke.shift ? SHIFT_REACH : 0);
}

export function isHaraka(char: string): boolean {
  return HARAKAT.has(char);
}

function ligatureKeysOf(caps: readonly KeyCap[]): ReadonlyMap<string, string> {
  const keys = new Map<string, string>();
  for (const cap of caps) {
    for (const glyph of [cap.base, cap.shift]) {
      if (LIGATURE_FORMS.has(glyph)) {
        keys.set(expandLigature(glyph), glyph);
      }
    }
  }
  return keys;
}

export const LIGATURE_KEYS: ReadonlyMap<string, string> = ligatureKeysOf(WIN101_CAPS);

export function isLigatureKey(glyph: string): boolean {
  return LIGATURE_FORMS.has(glyph);
}
