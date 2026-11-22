import { expect, test } from "vitest";
import { type ActivationKey, activatesOnEnter, isOnControl } from "./activation.ts";

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

function targetWith(found: unknown): { target: EventTarget; asked: string[] } {
  const asked: string[] = [];
  const target = Object.assign(new EventTarget(), {
    closest: (selector: string) => {
      asked.push(selector);
      return found;
    },
  });
  return { target, asked };
}

test("a target inside a control is on a control, and one with no control around it is not", () => {
  expect(isOnControl(targetWith({}).target)).toBe(true);
  expect(isOnControl(targetWith(null).target)).toBe(false);
});

test("what is not an element, or nothing at all, is never on a control", () => {
  expect(isOnControl(null)).toBe(false);
  expect(isOnControl(new EventTarget())).toBe(false);
  expect(isOnControl(Object.assign(new EventTarget(), { closest: "not a function" }))).toBe(false);
});

test("buttons, links, fields, dialogs and anything focusable count as controls", () => {
  const { target, asked } = targetWith(null);
  isOnControl(target);
  const [selector = ""] = asked;
  for (const control of [
    "a[href]",
    "button",
    "input",
    "select",
    "textarea",
    "dialog",
    "[contenteditable]",
    "[tabindex",
  ]) {
    expect(selector, control).toContain(control);
  }
});
