import type { MessageKey } from "./en.ts";

const MARK_NAME_KEYS: ReadonlyMap<string, MessageKey> = new Map([
  [String.fromCodePoint(0x64e), "mark.fatha"],
  [String.fromCodePoint(0x650), "mark.kasra"],
  [String.fromCodePoint(0x64f), "mark.damma"],
  [String.fromCodePoint(0x652), "mark.sukun"],
  [String.fromCodePoint(0x651), "mark.shadda"],
  [String.fromCodePoint(0x64b), "mark.fathatan"],
  [String.fromCodePoint(0x64d), "mark.kasratan"],
  [String.fromCodePoint(0x64c), "mark.dammatan"],
]);

export function markNameKey(char: string): MessageKey | undefined {
  return MARK_NAME_KEYS.get(char);
}
