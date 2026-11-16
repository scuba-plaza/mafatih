import { expect, test } from "vitest";
import { type ActivationKey, activatesOnEnter } from "./activation.ts";

const PLAIN_ENTER: ActivationKey = {
  key: "Enter",
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  repeat: false,
  isComposing: false,
  onControl: false,
};

test("Enter on a page with nothing interactive focused activates the lesson", () => {
  expect(activatesOnEnter(PLAIN_ENTER)).toBe(true);
});

test("no other key activates the lesson", () => {
  for (const key of ["a", "ب", " ", "Tab", "PageDown", "Escape"]) {
    expect(activatesOnEnter({ ...PLAIN_ENTER, key }), key).toBe(false);
  }
});

test("Enter with a modifier, held down or during a composition does not activate", () => {
  expect(activatesOnEnter({ ...PLAIN_ENTER, ctrlKey: true })).toBe(false);
  expect(activatesOnEnter({ ...PLAIN_ENTER, metaKey: true })).toBe(false);
  expect(activatesOnEnter({ ...PLAIN_ENTER, altKey: true })).toBe(false);
  expect(activatesOnEnter({ ...PLAIN_ENTER, repeat: true })).toBe(false);
  expect(activatesOnEnter({ ...PLAIN_ENTER, isComposing: true })).toBe(false);
});

test("Enter on a control or in a dialog is left to that control", () => {
  expect(activatesOnEnter({ ...PLAIN_ENTER, onControl: true })).toBe(false);
});
