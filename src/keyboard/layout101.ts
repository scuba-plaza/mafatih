export interface KeyCap {
  readonly code: string;
  readonly base: string;
  readonly shift: string;
  readonly row: number;
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
  { code: "Backslash", base: "\\", shift: "|", row: 1 },

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

export interface KeyStroke {
  readonly code: string;
  readonly shift: boolean;
}

const HOME_ROW_CODES = ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL", "Semicolon"];

export const HOME_ROW_LETTERS: readonly string[] = WIN101_CAPS.filter((cap) => HOME_ROW_CODES.includes(cap.code)).map(
  (cap) => cap.base,
);

function strokesOf(caps: readonly KeyCap[]): ReadonlyMap<string, KeyStroke> {
  const strokes = new Map<string, KeyStroke>();
  for (const cap of caps) {
    if (!strokes.has(cap.base)) {
      strokes.set(cap.base, { code: cap.code, shift: false });
    }
    if (!strokes.has(cap.shift)) {
      strokes.set(cap.shift, { code: cap.code, shift: true });
    }
  }
  return strokes;
}

const STROKES = strokesOf(WIN101_CAPS);

export function strokeFor(char: string): KeyStroke | undefined {
  return STROKES.get(char);
}

export function reachOf(char: string): number {
  const stroke = strokeFor(char);
  if (stroke === undefined) {
    return FAR_REACH + SHIFT_REACH;
  }
  return (KEY_REACH[stroke.code] ?? FAR_REACH) + (stroke.shift ? SHIFT_REACH : 0);
}
