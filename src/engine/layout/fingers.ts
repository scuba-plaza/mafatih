export type Hand = "left" | "right";

export type Digit = "pinky" | "ring" | "middle" | "index" | "thumb";

export interface Finger {
  hand: Hand | "both";
  digit: Digit;
}

const ZONES: readonly (Finger & { codes: readonly string[] })[] = [
  { hand: "left", digit: "pinky", codes: ["Backquote", "Digit1", "KeyQ", "KeyA", "KeyZ"] },
  { hand: "left", digit: "ring", codes: ["Digit2", "KeyW", "KeyS", "KeyX"] },
  { hand: "left", digit: "middle", codes: ["Digit3", "KeyE", "KeyD", "KeyC"] },
  { hand: "left", digit: "index", codes: ["Digit4", "Digit5", "KeyR", "KeyT", "KeyF", "KeyG", "KeyV", "KeyB"] },
  { hand: "right", digit: "index", codes: ["Digit6", "Digit7", "KeyY", "KeyU", "KeyH", "KeyJ", "KeyN", "KeyM"] },
  { hand: "right", digit: "middle", codes: ["Digit8", "KeyI", "KeyK", "Comma"] },
  { hand: "right", digit: "ring", codes: ["Digit9", "KeyO", "KeyL", "Period"] },
  {
    hand: "right",
    digit: "pinky",
    codes: [
      "Digit0",
      "Minus",
      "Equal",
      "KeyP",
      "BracketLeft",
      "BracketRight",
      "Semicolon",
      "Quote",
      "Backslash",
      "Slash",
    ],
  },
  { hand: "both", digit: "thumb", codes: ["Space"] },
];

const FINGER_BY_CODE: ReadonlyMap<string, Finger> = new Map(
  ZONES.flatMap(({ hand, digit, codes }) => codes.map((code): [string, Finger] => [code, { hand, digit }])),
);

export const HOME_KEYS: ReadonlySet<string> = new Set([
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyJ",
  "KeyK",
  "KeyL",
  "Semicolon",
]);

export function fingerOf(code: string): Finger | undefined {
  return FINGER_BY_CODE.get(code);
}

export function fingerName(finger: Finger): string {
  return finger.hand === "both" ? "Either thumb" : `${finger.hand === "left" ? "Left" : "Right"} ${finger.digit}`;
}

export function sameFinger(a: Finger | undefined, b: Finger | undefined): boolean {
  return a !== undefined && b !== undefined && a.hand === b.hand && a.digit === b.digit;
}
