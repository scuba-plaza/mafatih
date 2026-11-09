import type { Tier } from "./normalize.ts";
import { CORE_HARAKAT, HARAKAT, TYPEABLE_LETTERS } from "./layout.ts";

export const LETTER_ORDER: readonly string[] = [
  "ب",
  "ي",
  "ل",
  "ا",
  "ت",
  "ن",
  "م",
  "ك",
  "ش",
  "س",
  "ع",
  "ف",
  "ه",
  "د",
  "ق",
  "ر",
  "ذ",
  "ص",
  "ض",
  "ث",
  "غ",
  "ح",
  "ج",
  "خ",
  "ز",
  "و",
  "ة",
  "ى",
  "ء",
  "ئ",
  "ؤ",
  "ط",
  "ظ",
  "أ",
  "إ",
  "آ",
];

export const UNLOCK_ACCURACY = 0.95;
export const UNLOCK_ATTEMPTS = 20;
export const TIER_ATTEMPTS = 8;
const WINDOW = 40;
const EARLY = 20;

export interface CharStat {
  attempts: number;
  recent: boolean[];
}

export interface Progress {
  unlocked: string[];
  tier: Tier;
  stats: Record<string, CharStat>;
}

export function beginProgress(): Progress {
  return { unlocked: [LETTER_ORDER[0]], tier: "none", stats: {} };
}

export function recentAccuracy(stat: CharStat): number {
  const window = stat.recent.length <= EARLY ? stat.recent : stat.recent.slice(-WINDOW);
  if (window.length === 0) {
    return 0;
  }
  return window.filter(Boolean).length / window.length;
}

function statOf(progress: Progress, char: string): CharStat {
  return progress.stats[char] ?? { attempts: 0, recent: [] };
}

export function recordAttempt(progress: Progress, char: string, correct: boolean): Progress {
  const stat = statOf(progress, char);
  const recent = [...stat.recent, correct].slice(-WINDOW);
  return { ...progress, stats: { ...progress.stats, [char]: { attempts: stat.attempts + 1, recent } } };
}

export function focusLetter(progress: Progress): string {
  return progress.unlocked.at(-1) ?? LETTER_ORDER[0];
}

function tierReady(progress: Progress, marks: ReadonlySet<string>): boolean {
  for (const mark of marks) {
    const stat = statOf(progress, mark);
    if (stat.attempts < TIER_ATTEMPTS || recentAccuracy(stat) < UNLOCK_ACCURACY) {
      return false;
    }
  }
  return true;
}

export function advance(progress: Progress): Progress {
  let next = progress;
  const focus = focusLetter(next);
  const stat = statOf(next, focus);
  if (stat.attempts >= UNLOCK_ATTEMPTS && recentAccuracy(stat) >= UNLOCK_ACCURACY) {
    const index = LETTER_ORDER.indexOf(focus);
    const upcoming = LETTER_ORDER[index + 1];
    if (upcoming !== undefined) {
      next = { ...next, unlocked: [...next.unlocked, upcoming] };
    }
  }
  const allLetters = next.unlocked.length >= TYPEABLE_LETTERS.length;
  if (allLetters && next.tier === "none" && tierReady(next, CORE_HARAKAT)) {
    next = { ...next, tier: "core" };
  }
  if (next.tier === "core" && tierReady(next, CORE_HARAKAT)) {
    next = { ...next, tier: "full" };
  }
  return next;
}

export function effectiveTier(progress: Progress, override: Tier | "auto"): Tier {
  if (override !== "auto") {
    return override;
  }
  return progress.tier;
}

export function unlockedSet(progress: Progress): ReadonlySet<string> {
  return new Set(progress.unlocked);
}

export function isHaraka(char: string): boolean {
  return HARAKAT.has(char);
}
