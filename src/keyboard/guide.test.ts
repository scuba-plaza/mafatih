import { expect, test } from "vitest";
import { guideFor } from "./guide.ts";

const FATHA = String.fromCodePoint(0x64e);
const KASRA = String.fromCodePoint(0x650);
const ARABIC_COMMA = String.fromCodePoint(0x60c);
const LAM = String.fromCodePoint(0x644);
const ALEF = String.fromCodePoint(0x627);
const ALEF_HAMZA_ABOVE = String.fromCodePoint(0x623);
const BEH = String.fromCodePoint(0x628);

function keys(next: string | undefined, deleting = false): string[] {
  return [...guideFor(next, deleting).keys].sort();
}

test("a plain letter is one key, pressed by the finger whose column it is in", () => {
  const guide = guideFor(BEH, false);
  expect([...guide.keys]).toEqual(["KeyF"]);
  expect(guide.shifted).toBe(false);
  expect(guide.finger).toEqual({ hand: "left", digit: "index" });
});

test("a character on the shifted layer adds the Shift key of the other hand", () => {
  expect(keys(FATHA)).toEqual(["KeyQ", "ShiftRight"]);
  expect(keys(KASRA)).toEqual(["KeyA", "ShiftRight"]);
  expect(keys(ARABIC_COMMA)).toEqual(["KeyK", "ShiftLeft"]);
  expect(guideFor(FATHA, false).shifted).toBe(true);
  expect(guideFor(FATHA, false).finger).toEqual({ hand: "left", digit: "pinky" });
});

test("lam-alef is typed with its own key, and each letter alone with its own", () => {
  expect(keys(LAM + ALEF)).toEqual(["KeyB"]);
  expect(guideFor(LAM + ALEF, false).shifted).toBe(false);
  expect(keys(LAM + ALEF_HAMZA_ABOVE)).toEqual(["KeyG", "ShiftRight"]);
  expect(keys(LAM)).toEqual(["KeyG"]);
  expect(keys(ALEF)).toEqual(["KeyH"]);
});

test("a space is the space bar, under the thumbs", () => {
  expect(keys(" ")).toEqual(["Space"]);
  expect(guideFor(" ", false).finger).toEqual({ hand: "both", digit: "thumb" });
});

test("while mistakes wait to be deleted only Backspace is due, whatever comes next", () => {
  const guide = guideFor(FATHA, true);
  expect([...guide.keys]).toEqual(["Backspace"]);
  expect(guide.shifted).toBe(false);
  expect(guide.finger).toEqual({ hand: "right", digit: "pinky" });
  expect(keys(undefined, true)).toEqual(["Backspace"]);
});

test("nothing is due at the end of the text or for a character the layout does not have", () => {
  for (const next of [undefined, "", "x", String.fromCodePoint(0x670)]) {
    const guide = guideFor(next, false);
    expect([...guide.keys], String(next)).toEqual([]);
    expect(guide.shifted).toBe(false);
    expect(guide.finger).toBeUndefined();
  }
});
