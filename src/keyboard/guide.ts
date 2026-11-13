import { type Finger, fingerOf } from "./fingers.ts";
import { strokeFor } from "./layout101.ts";
import { LIGATURE_KEYS } from "./ligatures.ts";

export interface Guide {
  readonly keys: ReadonlySet<string>;
  readonly shifted: boolean;
  readonly finger: Finger | undefined;
}

const BACKSPACE_FINGER: Finger = { hand: "right", digit: "pinky" };

export function guideFor(next: string | undefined, deleting: boolean): Guide {
  if (deleting) {
    return { keys: new Set(["Backspace"]), shifted: false, finger: BACKSPACE_FINGER };
  }
  const stroke = next === undefined ? undefined : strokeFor(LIGATURE_KEYS.get(next) ?? next);
  if (stroke === undefined) {
    return { keys: new Set(), shifted: false, finger: undefined };
  }
  const finger = fingerOf(stroke.code);
  const shiftOfOtherHand = finger?.hand === "left" ? "ShiftRight" : "ShiftLeft";
  return {
    keys: new Set(stroke.shift ? [stroke.code, shiftOfOtherHand] : [stroke.code]),
    shifted: stroke.shift,
    finger,
  };
}
