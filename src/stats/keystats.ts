import { LIGATURE_KEYS } from "~/keyboard/ligatures.ts";
import { isTypeable } from "~/keyboard/typeable.ts";
import { isAmount, isCount, isRecord } from "~/lib/guards.ts";
import { LATENCY_CAP_MS, type Sample } from "~/typing/session.ts";

interface KeyStat {
  readonly attempts: number;
  readonly hits: number;
  readonly timed: number;
  readonly meanMs: number;
  readonly recentAccuracy: number;
}

export type KeyStats = Readonly<Record<string, KeyStat>>;

const NEVER_TYPED: KeyStat = { attempts: 0, hits: 0, timed: 0, meanMs: 0, recentAccuracy: 0 };
const LATENCY_WEIGHT = 0.25;
const SLOWEST_ACCURACY_RATE = 0.05;

export function statOf(stats: KeyStats, key: string): KeyStat {
  return Object.hasOwn(stats, key) ? (stats[key] ?? NEVER_TYPED) : NEVER_TYPED;
}

function nextMeanMs(before: KeyStat, latency: number | null): number {
  if (latency === null) {
    return before.meanMs;
  }
  if (before.timed === 0) {
    return latency;
  }
  return before.meanMs + LATENCY_WEIGHT * (latency - before.meanMs);
}

export function recordSample(stats: KeyStats, sample: Sample): KeyStats {
  const before = statOf(stats, sample.expected);
  const latency = sample.correct ? sample.latencyMs : null;
  const hit = sample.correct ? 1 : 0;
  const rate = Math.max(SLOWEST_ACCURACY_RATE, 1 / (before.attempts + 1));
  const after: KeyStat = {
    attempts: before.attempts + 1,
    hits: before.hits + hit,
    timed: before.timed + (latency === null ? 0 : 1),
    meanMs: nextMeanMs(before, latency),
    recentAccuracy: before.recentAccuracy + rate * (hit - before.recentAccuracy),
  };
  return { ...stats, [sample.expected]: after };
}

function sanitizeStat(raw: unknown): KeyStat | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const { attempts, hits, timed, meanMs, recentAccuracy } = raw;
  const counts = isCount(attempts) && isCount(hits) && isCount(timed) && hits <= attempts && timed <= hits;
  const valid = counts && isAmount(meanMs, LATENCY_CAP_MS) && isAmount(recentAccuracy, 1);
  return valid ? { attempts, hits, timed, meanMs, recentAccuracy } : undefined;
}

export function sanitizeStats(raw: unknown): KeyStats {
  if (!isRecord(raw)) {
    return {};
  }
  const kept: [string, KeyStat][] = [];
  for (const key of Object.keys(raw)) {
    const stat = isTypeable(key) || LIGATURE_KEYS.has(key) ? sanitizeStat(raw[key]) : undefined;
    if (stat !== undefined) {
      kept.push([key, stat]);
    }
  }
  return Object.fromEntries(kept);
}
