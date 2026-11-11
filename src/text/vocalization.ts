import { HARAKAT, TANWEEN } from "./arabic.ts";

export type Vocalization = "auto" | "letters" | "harakat" | "full";

export function requiredMarks(vocalization: Vocalization, unlocked: ReadonlySet<string>): ReadonlySet<string> {
  if (vocalization === "auto") {
    return new Set(unlocked);
  }
  if (vocalization === "letters") {
    return new Set();
  }
  return new Set(vocalization === "harakat" ? HARAKAT : [...HARAKAT, ...TANWEEN]);
}
