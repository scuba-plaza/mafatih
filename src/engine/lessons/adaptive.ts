import { fits, type Mask, maskOfFirst, type WordEntry, words } from "~/engine/corpus/corpus.ts";
import { skeleton, stripToTier, type Tier } from "~/engine/corpus/normalize.ts";
import type { Lesson } from "~/engine/lessons/lesson.ts";
import { createRng } from "~/engine/lessons/rng.ts";

export interface AdaptiveOptions {
  unlockedCount: number;
  tier: Tier;
  seed: number;
  focusLetter?: string;
  targetLength?: number;
  maxRepeat?: number;
}

const DEFAULT_TARGET_LENGTH = 38;
const FOCUS_BOOST = 6;

export function candidateWords(unlockedCount: number): WordEntry[] {
  const unlocked: Mask = maskOfFirst(unlockedCount);
  return words().filter((w) => fits(w, unlocked));
}

export function generateAdaptiveLesson(options: AdaptiveOptions): Lesson {
  const { unlockedCount, tier, seed, focusLetter } = options;
  const targetLength = options.targetLength ?? DEFAULT_TARGET_LENGTH;
  const maxRepeat = options.maxRepeat ?? 2;

  const pool = candidateWords(unlockedCount);
  if (pool.length === 0) {
    throw new Error(`no words available for the first ${unlockedCount} letters`);
  }

  const rng = createRng(seed);
  const weights = new Map<WordEntry, number>(
    pool.map((w) => {
      const base = 1 + Math.log1p(w.freq);
      const focused = focusLetter !== undefined && skeleton(w.text).includes(focusLetter);
      return [w, focused ? base * FOCUS_BOOST : base];
    }),
  );
  const weight = (w: WordEntry): number => weights.get(w) ?? 0;

  const chosen: string[] = [];
  const recent: string[] = [];
  let length = 0;

  while (length < targetLength) {
    let candidate = rng.weighted(pool, weight).text;
    let guard = 0;
    while (recent.filter((r) => r === candidate).length >= maxRepeat && guard < 8) {
      candidate = rng.weighted(pool, weight).text;
      guard += 1;
    }
    const rendered = stripToTier(candidate, tier);
    if (rendered.length === 0) {
      continue;
    }
    chosen.push(rendered);
    recent.push(candidate);
    if (recent.length > 4) {
      recent.shift();
    }
    length += rendered.length + 1;
  }

  return { text: chosen.join(" "), tier, source: { kind: "adaptive" }, ayat: [], breaks: [], basmala: null };
}
