import { letterOrder } from "~/engine/corpus/corpus.ts";
import { TIERS, type Tier } from "~/engine/corpus/normalize.ts";
import { CORE_HARAKAT, TANWEEN } from "~/engine/layout/ara.ts";
import { attemptsOf, isMastered, type KeyStats, statFor } from "~/engine/stats/keystats.ts";

export interface Progress {
  unlockedCount: number;
  tier: Tier;
}

export interface UnlockConfig {
  minSamples: number;
  targetMs: number;
  minAccuracy: number;
  tierMinAttempts: number;
  tierMinAccuracy: number;
}

export const DEFAULT_UNLOCK_CONFIG: UnlockConfig = {
  minSamples: 8,
  targetMs: 700,
  minAccuracy: 0.95,
  tierMinAttempts: 40,
  tierMinAccuracy: 0.95,
};

export const STARTING_LETTERS = 6;

export function initialProgress(): Progress {
  return { unlockedCount: STARTING_LETTERS, tier: "none" };
}

export function unlockedLetters(progress: Progress): string[] {
  return letterOrder.slice(0, progress.unlockedCount);
}

export function focusLetter(progress: Progress): string | undefined {
  return letterOrder[progress.unlockedCount - 1];
}

export function tierChars(tier: Tier): string[] {
  if (tier === "core") {
    return [...CORE_HARAKAT];
  }
  if (tier === "full") {
    return [...TANWEEN];
  }
  return [];
}

export function shouldUnlockNext(stats: KeyStats, progress: Progress, config: UnlockConfig): boolean {
  if (progress.unlockedCount >= letterOrder.length) {
    return false;
  }
  const focus = focusLetter(progress);
  if (focus === undefined) {
    return false;
  }
  return isMastered(statFor(stats, focus), config.minSamples, config.targetMs, config.minAccuracy);
}

function tierAfter(tier: Tier): Tier | undefined {
  const index = TIERS.indexOf(tier);
  return index < 0 ? undefined : TIERS[index + 1];
}

export function shouldAdvanceTier(stats: KeyStats, progress: Progress, config: UnlockConfig): boolean {
  if (tierAfter(progress.tier) === undefined) {
    return false;
  }
  const active = [...unlockedLetters(progress), ...tierChars(progress.tier)];
  let attempts = 0;
  let hits = 0;
  for (const char of active) {
    const stat = statFor(stats, char);
    attempts += attemptsOf(stat);
    hits += stat.hits;
  }
  if (attempts < config.tierMinAttempts) {
    return false;
  }
  return hits / attempts >= config.tierMinAccuracy;
}

export function advanceProgress(stats: KeyStats, progress: Progress, config: UnlockConfig): Progress {
  let next: Progress = { ...progress };
  if (shouldUnlockNext(stats, next, config)) {
    next = { ...next, unlockedCount: next.unlockedCount + 1 };
  }
  const upgraded = shouldAdvanceTier(stats, next, config) ? tierAfter(next.tier) : undefined;
  if (upgraded !== undefined) {
    next = { ...next, tier: upgraded };
  }
  return next;
}
