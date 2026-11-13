import type { Passage, Span } from "../passage.ts";

export const RING_RADIUS = 45;
export const RING_LENGTH = 2 * Math.PI * RING_RADIUS;
export const MIN_ARC = 19;
const GAP = 11;

export interface Arc {
  readonly start: number;
  readonly length: number;
}

function wordsIn(passage: Passage, span: Span): number {
  const words = passage.prompt.shown
    .slice(span.start, span.end)
    .split(" ")
    .filter((word) => word !== "");
  return Math.max(1, words.length);
}

export function stopWeights(passage: Passage): readonly number[] {
  const basmala = passage.basmala === null ? [] : [wordsIn(passage, passage.basmala)];
  return [...basmala, ...passage.ayat.map((ayah) => wordsIn(passage, ayah))];
}

export function arcLengths(weights: readonly number[], total: number, floor: number): readonly number[] {
  if (weights.length * floor > total) {
    return weights.map(() => total / weights.length);
  }
  const held = new Set<number>();
  let settled = false;
  while (!settled) {
    const free = weights.reduce((sum, weight, index) => sum + (held.has(index) ? 0 : weight), 0);
    const room = total - held.size * floor;
    const small = weights.flatMap((weight, index) =>
      !held.has(index) && (room * weight) / free < floor ? [index] : [],
    );
    for (const index of small) {
      held.add(index);
    }
    settled = small.length === 0;
  }
  const free = weights.reduce((sum, weight, index) => sum + (held.has(index) ? 0 : weight), 0);
  const room = total - held.size * floor;
  return weights.map((weight, index) => (held.has(index) ? floor : (room * weight) / free));
}

export function ringArcs(weights: readonly number[]): readonly Arc[] {
  const gap = weights.length === 1 ? 0 : GAP;
  const lengths = arcLengths(weights, RING_LENGTH - gap * weights.length, MIN_ARC);
  let at = gap / 2;
  return lengths.map((length) => {
    const arc = { start: at, length };
    at += length + gap;
    return arc;
  });
}
