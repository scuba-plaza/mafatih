import { LIGATURE_KEYS } from "~/keyboard/ligatures.ts";
import { isTypeable } from "~/keyboard/typeable.ts";
import { isMark } from "./arabic.ts";

export interface Unit {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

export interface Prompt {
  readonly shown: string;
  readonly units: readonly Unit[];
  readonly breaks: readonly number[];
}

function singleUnits(shown: string, required: ReadonlySet<string>): Unit[] {
  const units: Unit[] = [];
  let start = 0;
  for (const char of shown) {
    const end = start + char.length;
    if (isMark(char) ? required.has(char) : isTypeable(char)) {
      units.push({ text: char, start, end });
    }
    start = end;
  }
  return units;
}

function mergeLamAlef(units: readonly Unit[]): Unit[] {
  const merged: Unit[] = [];
  for (const unit of units) {
    const previous = merged.at(-1);
    if (previous !== undefined && LIGATURE_KEYS.has(previous.text + unit.text)) {
      merged[merged.length - 1] = { text: previous.text + unit.text, start: previous.start, end: unit.end };
    } else {
      merged.push(unit);
    }
  }
  return merged;
}

export function buildPrompt(shown: string, required: ReadonlySet<string>, breaks: readonly number[] = []): Prompt {
  return { shown, units: mergeLamAlef(singleUnits(shown, required)), breaks };
}
