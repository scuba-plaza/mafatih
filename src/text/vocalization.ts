import { HARAKAT, TANWEEN } from "./arabic.ts";

export type Vocalization = "auto" | "letters" | "harakat" | "full";

const NONE: ReadonlySet<string> = new Set();
const BASIC: ReadonlySet<string> = new Set(HARAKAT);
const ALL: ReadonlySet<string> = new Set([...HARAKAT, ...TANWEEN]);

export function requiredMarks(vocalization: Vocalization, unlocked: ReadonlySet<string>): ReadonlySet<string> {
  if (vocalization === "auto") {
    return unlocked;
  }
  if (vocalization === "letters") {
    return NONE;
  }
  return vocalization === "harakat" ? BASIC : ALL;
}
