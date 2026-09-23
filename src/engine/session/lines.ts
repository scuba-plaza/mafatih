import { isHaraka } from "~/engine/layout/ara.ts";

export interface Line {
  start: number;
  end: number;
  text: string;
}

export const DEFAULT_LINE_LENGTH = 38;

export type Advance = (from: number, to: number) => number;

function countingAdvance(chars: readonly string[]): Advance {
  const offsets = [0];
  let width = 0;
  for (const char of chars) {
    width += isHaraka(char) ? 0 : 1;
    offsets.push(width);
  }
  return (from, to) => (offsets[to] ?? 0) - (offsets[from] ?? 0);
}

export function chunkIntoLines(
  chars: readonly string[],
  limit = DEFAULT_LINE_LENGTH,
  breaks: readonly number[] = [],
  advanceOf?: Advance,
): Line[] {
  if (chars.length === 0) {
    return [];
  }

  const units: { start: number; end: number }[] = [];
  let unitStart = 0;
  for (let i = 0; i < chars.length; i += 1) {
    if (chars[i] === " ") {
      units.push({ start: unitStart, end: i + 1 });
      unitStart = i + 1;
    }
  }
  if (unitStart < chars.length) {
    units.push({ start: unitStart, end: chars.length });
  }

  const forced = new Set(breaks);
  const advance = advanceOf ?? countingAdvance(chars);
  const lines: Line[] = [];
  const push = (start: number, end: number): void => {
    lines.push({ start, end, text: chars.slice(start, end).join("") });
  };
  let lineStart = units[0]?.start ?? 0;
  let lineEnd = lineStart;

  for (const unit of units) {
    if (lineEnd > lineStart && (forced.has(unit.start) || advance(lineStart, unit.end) > limit)) {
      push(lineStart, lineEnd);
      lineStart = unit.start;
    }
    lineEnd = unit.end;
  }
  if (lineEnd > lineStart) {
    push(lineStart, lineEnd);
  }

  return lines;
}

export function lineIndexFor(lines: readonly Line[], cursor: number): number {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line !== undefined && cursor < line.end) {
      return i;
    }
  }
  return Math.max(0, lines.length - 1);
}

export interface AyahCut {
  ayah: number;
  end: number;
}

export interface LineSegment {
  start: number;
  end: number;
  text: string;
  ayahEnd: number | null;
}

export function segmentLine(line: Line, cuts: readonly AyahCut[]): LineSegment[] {
  const chars = [...line.text];
  const inside = cuts.filter((cut) => cut.end > line.start && cut.end <= line.end).sort((a, b) => a.end - b.end);

  const segments: LineSegment[] = [];
  let at = line.start;
  for (const cut of inside) {
    if (cut.end <= at) {
      continue;
    }
    segments.push({
      start: at,
      end: cut.end,
      text: chars.slice(at - line.start, cut.end - line.start).join(""),
      ayahEnd: cut.ayah,
    });
    at = cut.end;
  }
  if (at < line.end || segments.length === 0) {
    segments.push({
      start: at,
      end: line.end,
      text: chars.slice(at - line.start).join(""),
      ayahEnd: null,
    });
  }
  return segments;
}
