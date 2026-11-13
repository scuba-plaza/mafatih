import { isRecord } from "~/lib/guards.ts";
import { type KeyStats, statOf } from "~/stats/keystats.ts";
import { isMark } from "~/text/arabic.ts";

export interface Rung {
  readonly kind: "letter" | "mark";
  readonly char: string;
}

interface Ladder {
  readonly rungs: readonly Rung[];
  readonly starter: number;
}

export interface LadderProgress {
  readonly unlocked: number;
}

export interface UnlockConfig {
  readonly minSamples: number;
  readonly letterMs: number;
  readonly markMs: number;
  readonly minAccuracy: number;
}

const STARTER_LETTERS = "ايملبتنسكش";
const LATER_LETTERS = "رةعوقحفصطخهأزجدضثغءىئظؤإذآ";
const MARKS_IN_ORDER = "\u064E\u0650\u064F\u0652\u0651\u064B\u064D\u064C";

const ROUNDING = 1e-9;

export const LADDER: Ladder = {
  rungs: [...STARTER_LETTERS, ...LATER_LETTERS, ...MARKS_IN_ORDER].map((char) => ({
    kind: isMark(char) ? "mark" : "letter",
    char,
  })),
  starter: STARTER_LETTERS.length,
};

export const DEFAULT_UNLOCK_CONFIG: UnlockConfig = { minSamples: 8, letterMs: 700, markMs: 1000, minAccuracy: 0.95 };

export function initialProgress(): LadderProgress {
  return { unlocked: LADDER.starter };
}

function unlockedOf(kind: Rung["kind"], progress: LadderProgress): ReadonlySet<string> {
  const reached = LADDER.rungs.slice(0, progress.unlocked);
  return new Set(reached.filter((rung) => rung.kind === kind).map((rung) => rung.char));
}

export function unlockedLetters(progress: LadderProgress): ReadonlySet<string> {
  return unlockedOf("letter", progress);
}

export function unlockedMarks(progress: LadderProgress): ReadonlySet<string> {
  return unlockedOf("mark", progress);
}

export function focusRung(progress: LadderProgress): Rung | undefined {
  return LADDER.rungs[progress.unlocked - 1];
}

function isMastered(stats: KeyStats, rung: Rung, config: UnlockConfig): boolean {
  const stat = statOf(stats, rung.char);
  const fastEnough = stat.meanMs <= (rung.kind === "mark" ? config.markMs : config.letterMs);
  return stat.timed >= config.minSamples && fastEnough && stat.recentAccuracy >= config.minAccuracy - ROUNDING;
}

export function advance(
  stats: KeyStats,
  progress: LadderProgress,
  config: UnlockConfig = DEFAULT_UNLOCK_CONFIG,
): LadderProgress {
  const focus = focusRung(progress);
  const canClimb = focus !== undefined && progress.unlocked < LADDER.rungs.length && isMastered(stats, focus, config);
  return canClimb ? { unlocked: progress.unlocked + 1 } : progress;
}

export function sanitizeProgress(raw: unknown): LadderProgress {
  const unlocked = isRecord(raw) ? raw.unlocked : undefined;
  if (typeof unlocked !== "number" || !Number.isInteger(unlocked)) {
    return initialProgress();
  }
  return { unlocked: Math.min(Math.max(unlocked, LADDER.starter), LADDER.rungs.length) };
}
