export interface KeyCap {
  code: string;
  base: string;
  shift: string;
  row: number;
}

export type LayoutId = "win101" | "mac";

export interface KeyboardLayout {
  id: LayoutId;
  name: string;
  caps: readonly KeyCap[];
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

export const MAC_CAPS: readonly KeyCap[] = [
  { code: "Backquote", base: "ـ", shift: "", row: 0 },
  { code: "Digit1", base: "١", shift: "!", row: 0 },
  { code: "Digit2", base: "٢", shift: "@", row: 0 },
  { code: "Digit3", base: "٣", shift: "#", row: 0 },
  { code: "Digit4", base: "٤", shift: "$", row: 0 },
  { code: "Digit5", base: "٥", shift: "٪", row: 0 },
  { code: "Digit6", base: "٦", shift: "^", row: 0 },
  { code: "Digit7", base: "٧", shift: "&", row: 0 },
  { code: "Digit8", base: "٨", shift: "*", row: 0 },
  { code: "Digit9", base: "٩", shift: ")", row: 0 },
  { code: "Digit0", base: "٠", shift: "(", row: 0 },
  { code: "Minus", base: "-", shift: "_", row: 0 },
  { code: "Equal", base: "=", shift: "+", row: 0 },

  { code: "KeyQ", base: "ض", shift: "َ", row: 1 },
  { code: "KeyW", base: "ص", shift: "ً", row: 1 },
  { code: "KeyE", base: "ث", shift: "ِ", row: 1 },
  { code: "KeyR", base: "ق", shift: "ٍ", row: 1 },
  { code: "KeyT", base: "ف", shift: "ُ", row: 1 },
  { code: "KeyY", base: "غ", shift: "ٌ", row: 1 },
  { code: "KeyU", base: "ع", shift: "ْ", row: 1 },
  { code: "KeyI", base: "ه", shift: "ّ", row: 1 },
  { code: "KeyO", base: "خ", shift: "]", row: 1 },
  { code: "KeyP", base: "ح", shift: "[", row: 1 },
  { code: "BracketLeft", base: "ج", shift: "}", row: 1 },
  { code: "BracketRight", base: "ة", shift: "{", row: 1 },

  { code: "KeyA", base: "ش", shift: "»", row: 2 },
  { code: "KeyS", base: "س", shift: "«", row: 2 },
  { code: "KeyD", base: "ي", shift: "ى", row: 2 },
  { code: "KeyF", base: "ب", shift: "ٰ", row: 2 },
  { code: "KeyG", base: "ل", shift: "", row: 2 },
  { code: "KeyH", base: "ا", shift: "آ", row: 2 },
  { code: "KeyJ", base: "ت", shift: "ٱ", row: 2 },
  { code: "KeyK", base: "ن", shift: "", row: 2 },
  { code: "KeyL", base: "م", shift: "", row: 2 },
  { code: "Semicolon", base: "ك", shift: ":", row: 2 },
  { code: "Quote", base: "؛", shift: '"', row: 2 },
  { code: "Backslash", base: "\\", shift: "|", row: 2 },

  { code: "KeyZ", base: "ظ", shift: "", row: 3 },
  { code: "KeyX", base: "ط", shift: "", row: 3 },
  { code: "KeyC", base: "ذ", shift: "ئ", row: 3 },
  { code: "KeyV", base: "د", shift: "ء", row: 3 },
  { code: "KeyB", base: "ز", shift: "أ", row: 3 },
  { code: "KeyN", base: "ر", shift: "إ", row: 3 },
  { code: "KeyM", base: "و", shift: "ؤ", row: 3 },
  { code: "Comma", base: "،", shift: ">", row: 3 },
  { code: "Period", base: ".", shift: "<", row: 3 },
  { code: "Slash", base: "/", shift: "؟", row: 3 },

  { code: "Space", base: " ", shift: " ", row: 4 },
];

export const LAYOUTS: Record<LayoutId, KeyboardLayout> = {
  win101: { id: "win101", name: "Arabic (101)", caps: WIN101_CAPS },
  mac: { id: "mac", name: "Arabic (Macintosh)", caps: MAC_CAPS },
};

export const LAYOUT_IDS: readonly LayoutId[] = ["win101", "mac"];

export function isLayoutId(value: unknown): value is LayoutId {
  return typeof value === "string" && LAYOUT_IDS.includes(value as LayoutId);
}

export const DEFAULT_LAYOUT: LayoutId = "win101";

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

function glyphsOf(caps: readonly KeyCap[]): Set<string> {
  const seen = new Set<string>();
  for (const cap of caps) {
    for (const glyph of [cap.base, cap.shift]) {
      if (glyph !== "" && glyph !== TATWEEL) {
        seen.add(glyph);
      }
    }
  }
  return seen;
}

function lettersOf(caps: readonly KeyCap[]): string[] {
  return [...glyphsOf(caps)].filter((glyph) => ARABIC_LETTER.test(glyph));
}

function reachableOnEveryLayout(): string[] {
  const [first, ...rest] = LAYOUT_IDS.map((id) => glyphsOf(LAYOUTS[id].caps));
  return [...(first ?? [])].filter((glyph) => rest.every((layout) => layout.has(glyph)));
}

export const TYPEABLE_LETTERS: readonly string[] = lettersOf(WIN101_CAPS);

export const TYPEABLE_PUNCTUATION: readonly string[] = reachableOnEveryLayout().filter(
  (glyph) => glyph !== " " && !ARABIC_LETTER.test(glyph) && !HARAKAT.has(glyph),
);

export const TYPEABLE: ReadonlySet<string> = new Set([...TYPEABLE_LETTERS, ...HARAKAT, ...TYPEABLE_PUNCTUATION, " "]);

export function lettersOfLayout(id: LayoutId): string[] {
  return lettersOf(LAYOUTS[id].caps);
}

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

const STROKE_INDEX: Record<LayoutId, ReadonlyMap<string, KeyStroke>> = {
  win101: indexOf(WIN101_CAPS),
  mac: indexOf(MAC_CAPS),
};

export function strokeFor(char: string, layout: LayoutId = DEFAULT_LAYOUT): KeyStroke | undefined {
  return STROKE_INDEX[layout].get(char);
}

export function capsOf(layout: LayoutId): readonly KeyCap[] {
  return LAYOUTS[layout].caps;
}

export function isHaraka(char: string): boolean {
  return HARAKAT.has(char);
}
