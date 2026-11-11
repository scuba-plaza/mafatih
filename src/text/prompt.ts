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
    if (isTypeable(char) && (!isMark(char) || required.has(char))) {
      units.push({ text: char, start, end });
    }
    start = end;
  }
  return units;
}

function mergeLamAlef(units: readonly Unit[], breaks: readonly number[]): Unit[] {
  const merged: Unit[] = [];
  for (const unit of units) {
    const previous = merged.at(-1);
    const splitByBreak = breaks.some(
      (offset) => previous !== undefined && previous.start < offset && offset <= unit.start,
    );
    if (previous !== undefined && !splitByBreak && LIGATURE_KEYS.has(previous.text + unit.text)) {
      merged[merged.length - 1] = { text: previous.text + unit.text, start: previous.start, end: unit.end };
    } else {
      merged.push(unit);
    }
  }
  return merged;
}

function breaksWithin(shown: string, breaks: readonly number[]): number[] {
  const inside = breaks.filter((offset) => Number.isInteger(offset) && offset > 0 && offset < shown.length);
  return [...new Set(inside)].sort((a, b) => a - b);
}

export function buildPrompt(shown: string, required: ReadonlySet<string>, breaks: readonly number[] = []): Prompt {
  const kept = breaksWithin(shown, breaks);
  return { shown, units: mergeLamAlef(singleUnits(shown, required), kept), breaks: kept };
}
