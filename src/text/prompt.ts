import { LIGATURE_KEYS } from "~/keyboard/ligatures.ts";
import { isTypeable } from "~/keyboard/typeable.ts";
import { isMark } from "./arabic.ts";

export const NO_BREAK_SPACE = "\u00A0";

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

export function wordAt(prompt: Prompt, offset: number): string {
  const { shown, breaks } = prompt;
  const isSpace = (index: number) => shown.charAt(index) === " " || shown.charAt(index) === NO_BREAK_SPACE;
  let start = Math.max(0, offset);
  while (start < shown.length && isSpace(start)) {
    start += 1;
  }
  if (start >= shown.length) {
    return "";
  }
  while (start > 0 && !isSpace(start - 1) && !breaks.includes(start)) {
    start -= 1;
  }
  let end = start + 1;
  while (end < shown.length && !isSpace(end) && !breaks.includes(end)) {
    end += 1;
  }
  return shown.slice(start, end);
}
