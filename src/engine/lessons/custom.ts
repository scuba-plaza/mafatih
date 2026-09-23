import { composeText, normalizeText, stripToTier, type Tier, untypeableChars } from "~/engine/corpus/normalize.ts";
import type { Lesson } from "~/engine/lessons/lesson.ts";

export const DEFAULT_CUSTOM_TEXT = "الحمد لله رب العالمين";

export const MAX_CUSTOM_CHARS = 5000;

export interface CustomTextReport {
  lines: readonly string[];
  dropped: readonly string[];
  length: number;
}

function sourceLines(raw: string): string[] {
  return raw
    .slice(0, MAX_CUSTOM_CHARS)
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim());
}

export function inspectCustomText(raw: string): CustomTextReport {
  const dropped = new Set<string>();
  const lines: string[] = [];
  for (const line of sourceLines(raw)) {
    for (const char of untypeableChars(composeText(line))) {
      dropped.add(char);
    }
    const kept = normalizeText(line);
    if (kept.length > 0) {
      lines.push(kept);
    }
  }
  return { lines, dropped: [...dropped], length: [...lines.join(" ")].length };
}

function renderedLines(raw: string, tier: Tier): string[] {
  return inspectCustomText(raw)
    .lines.map((line) => stripToTier(line, tier))
    .filter((line) => line.length > 0);
}

export interface CustomOptions {
  text: string;
  tier: Tier;
}

export function generateCustomLesson({ text, tier }: CustomOptions): Lesson {
  const own = renderedLines(text, tier);
  const lines = own.length > 0 ? own : renderedLines(DEFAULT_CUSTOM_TEXT, tier);

  const breaks: number[] = [];
  let offset = 0;
  for (const line of lines) {
    if (offset > 0) {
      breaks.push(offset);
    }
    offset += [...line].length + 1;
  }

  return { text: lines.join(" "), tier, source: { kind: "custom" }, ayat: [], breaks, basmala: null };
}
