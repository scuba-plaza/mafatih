import { type KeyStroke, LIGATURE_KEYS, strokeFor, WIN101_CAPS } from "~/engine/layout.ts";

const FINGER_OF: Readonly<Record<string, number>> = {
  Backquote: 0,
  KeyQ: 0,
  KeyA: 0,
  KeyZ: 0,
  KeyW: 1,
  KeyS: 1,
  KeyX: 1,
  KeyE: 2,
  KeyD: 2,
  KeyC: 2,
  KeyR: 3,
  KeyF: 3,
  KeyV: 3,
  KeyT: 4,
  KeyG: 4,
  KeyB: 4,
  KeyY: 5,
  KeyH: 5,
  KeyN: 5,
  KeyU: 6,
  KeyJ: 6,
  KeyM: 6,
  KeyI: 7,
  KeyK: 7,
  Comma: 7,
  KeyO: 8,
  KeyL: 8,
  Period: 8,
  Digit1: 9,
  Digit2: 9,
  Digit3: 9,
  Digit4: 9,
  Digit5: 9,
  Digit6: 9,
  Digit7: 9,
  Digit8: 9,
  Digit9: 9,
  Digit0: 9,
  Minus: 9,
  Equal: 9,
  KeyP: 9,
  BracketLeft: 9,
  BracketRight: 9,
  Semicolon: 9,
  Quote: 9,
  Backslash: 9,
  Slash: 9,
  Space: 10,
};

export function fingerOf(code: string): number {
  return FINGER_OF[code] ?? 9;
}

interface KeyboardProps {
  remaining: string;
  wrong: string | null;
  colored: boolean;
}

function nextStroke(remaining: string): KeyStroke | undefined {
  const ligature = LIGATURE_KEYS.get(remaining.slice(0, 2));
  if (ligature !== undefined) {
    return strokeFor(ligature);
  }
  return strokeFor(remaining[0] ?? "");
}

export function Keyboard({ remaining, wrong, colored }: KeyboardProps) {
  const stroke = wrong === null ? nextStroke(remaining) : undefined;
  const rows = [0, 1, 2, 3].map((row) => WIN101_CAPS.filter((cap) => cap.row === row));
  return (
    <div aria-hidden="true" className="flex flex-col items-center gap-1 select-none">
      {rows.map((caps, index) => (
        <div key={index} className="flex gap-1" style={{ marginLeft: `${index * 1.25}rem` }}>
          {caps.map((cap) => {
            const isNext = stroke !== undefined && stroke.code === cap.code;
            const shiftNeeded = isNext && stroke.shift && cap.shift !== cap.base;
            const glyph = shiftNeeded ? cap.shift : cap.base;
            const finger = colored ? ` finger-${fingerOf(cap.code)}` : "";
            return (
              <span
                key={cap.code}
                className={`key-cap${finger} ${isNext ? "next" : ""} ${shiftNeeded ? "shift-on" : ""}`}
              >
                {glyph}
              </span>
            );
          })}
        </div>
      ))}
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {stroke === undefined ? "\u00a0" : stroke.shift ? "Hold Shift" : "\u00a0"}
      </p>
    </div>
  );
}
