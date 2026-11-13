import type { Passage, Span } from "../passage.ts";

export const MIN_ARC = 15;

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
