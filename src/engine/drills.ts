import { HARAKAT, TANWEEN } from "./layout.ts";
import { hasHaraka, skeleton, stripToTier, type Tier } from "./normalize.ts";

export function lettersOf(word: string): string[] {
  return [...new Set([...skeleton(word)])];
}

export interface DrillOptions {
  words: readonly string[];
  unlocked: ReadonlySet<string>;
  tier: Tier;
  focus: string;
  count: number;
  rand: () => number;
}

export function composeDrill(options: DrillOptions): string {
  const candidates: string[] = [];
  for (const word of options.words) {
    if (!lettersOf(word).every((letter) => options.unlocked.has(letter))) {
      continue;
    }
    const stripped = stripToTier(word, options.tier);
    if (options.tier !== "none" && !hasHaraka(stripped)) {
      continue;
    }
    if (options.tier === "full" && ![...TANWEEN].some((mark) => stripped.includes(mark))) {
      continue;
    }
    candidates.push(stripped);
  }
  if (candidates.length === 0) {
    return "";
  }
  const picked: string[] = [];
  for (let i = 0; i < options.count; i++) {
    const withFocus = candidates.filter((word) => word.includes(options.focus));
    const pool = i < Math.ceil(options.count * 0.6) && withFocus.length > 0 ? withFocus : candidates;
    const previous = picked.at(-1);
    const pick = () => pool[Math.floor(options.rand() * pool.length)] ?? (candidates[0] as string);
    let word = pick();
    if (pool.length > 1) {
      for (let tries = 0; tries < 4 && word === previous; tries++) {
        word = pick();
      }
    }
    picked.push(word);
  }
  return picked.join(" ");
}

export function isHarakaOf(char: string): boolean {
  return HARAKAT.has(char);
}
