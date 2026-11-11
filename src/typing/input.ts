import { expandLigature } from "~/keyboard/ligatures.ts";
import type { Key } from "./session.ts";

export type InputAction =
  | { readonly kind: "key"; readonly key: Key }
  | { readonly kind: "latin" }
  | { readonly kind: "ignored" };

export const INPUT_SENTINEL = "\u200B";

const MOST_CHARACTERS_PER_KEY = 2;
const LATIN_LETTER = /[A-Za-z]/;
const LINE_BREAK = /[\n\r]/;
const BACKSPACE: InputAction = { kind: "key", key: { kind: "backspace" } };

function sharedPrefix(a: readonly string[], b: readonly string[]): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1;
  }
  return length;
}

function added(text: readonly string[]): InputAction[] {
  if (text.length === 0) {
    return [];
  }
  if (text.some((char) => LATIN_LETTER.test(char))) {
    return [{ kind: "latin" }];
  }
  const char = text.map(expandLigature).join("");
  if ([...char].length > MOST_CHARACTERS_PER_KEY || LINE_BREAK.test(char)) {
    return [{ kind: "ignored" }];
  }
  return [{ kind: "key", key: { kind: "char", char } }];
}

export function diffInput(previous: string, current: string): readonly InputAction[] {
  const before = [...previous];
  const after = [...current];
  const kept = sharedPrefix(before, after);
  const typed = added(after.slice(kept));
  if (typed.some((action) => action.kind !== "key")) {
    return typed;
  }
  return [...before.slice(kept).map(() => BACKSPACE), ...typed];
}
