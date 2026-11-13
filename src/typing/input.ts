import { expandLigature, LIGATURE_KEYS } from "~/keyboard/ligatures.ts";
import type { Key } from "./session.ts";

export interface InputChange {
  readonly keys: readonly Key[];
  readonly wrongLayout: boolean;
}

export const INPUT_SENTINEL = "\u200B";

const NO_BREAK_SPACE = /\u00A0/g;
const LETTER_OF_ANOTHER_SCRIPT = /(?![\p{Script=Arabic}ـ])\p{L}/u;
const NOT_A_KEY = /[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u;
const BACKSPACE: Key = { kind: "backspace" };

function visible(value: string): string[] {
  return [...value.replaceAll(INPUT_SENTINEL, "").replace(NO_BREAK_SPACE, " ")];
}

function sharedPrefix(a: readonly string[], b: readonly string[]): number {
  let length = 0;
  while (length < a.length && length < b.length && a[length] === b[length]) {
    length += 1;
  }
  return length;
}

function isOneKey(text: string): boolean {
  return !NOT_A_KEY.test(text) && ([...text].length === 1 || LIGATURE_KEYS.has(text));
}

export function diffInput(previous: string, current: string): InputChange {
  const before = visible(previous);
  const after = visible(current);
  if (before.length === 0 && after.length === 0) {
    const placeholderDeleted = previous.includes(INPUT_SENTINEL) && !current.includes(INPUT_SENTINEL);
    return { keys: placeholderDeleted ? [BACKSPACE] : [], wrongLayout: false };
  }
  const kept = sharedPrefix(before, after);
  const deleted = before.slice(kept).map(() => BACKSPACE);
  const added = after.slice(kept).map(expandLigature).join("");
  const wrongLayout = LETTER_OF_ANOTHER_SCRIPT.test(added);
  const typed: Key[] = !wrongLayout && isOneKey(added) ? [{ kind: "char", char: added }] : [];
  return { keys: [...deleted, ...typed], wrongLayout };
}
