import { isRecord } from "~/storage/guards.ts";
import type { Sample } from "~/typing/session.ts";

export interface KeyStat {
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
const MAX_KEYS = 200;
const LONGEST_KEY = 2;

export function statOf(stats: KeyStats, key: string): KeyStat {
  return Object.hasOwn(stats, key) ? (stats[key] ?? NEVER_TYPED) : NEVER_TYPED;
}

export function recordSample(stats: KeyStats, sample: Sample): KeyStats {
  const before = statOf(stats, sample.expected);
  const latency = sample.correct ? sample.latencyMs : null;
  const rate = Math.max(SLOWEST_ACCURACY_RATE, 1 / (before.attempts + 1));
  const meanMs =
    latency === null
      ? before.meanMs
      : before.timed === 0
        ? latency
        : before.meanMs + LATENCY_WEIGHT * (latency - before.meanMs);
  const after: KeyStat = {
    attempts: before.attempts + 1,
    hits: before.hits + (sample.correct ? 1 : 0),
    timed: before.timed + (latency === null ? 0 : 1),
    meanMs,
    recentAccuracy: before.recentAccuracy + rate * ((sample.correct ? 1 : 0) - before.recentAccuracy),
  };
  return { ...stats, [sample.expected]: after };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function sanitizeStat(raw: unknown): KeyStat | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const { attempts, hits, timed, meanMs, recentAccuracy } = raw;
  const counts = isCount(attempts) && isCount(hits) && isCount(timed) && hits <= attempts && timed <= hits;
  const speed = typeof meanMs === "number" && Number.isFinite(meanMs) && meanMs >= 0;
  const accuracy = typeof recentAccuracy === "number" && recentAccuracy >= 0 && recentAccuracy <= 1;
  return counts && speed && accuracy ? { attempts, hits, timed, meanMs, recentAccuracy } : undefined;
}

export function sanitizeStats(raw: unknown): KeyStats {
  if (!isRecord(raw)) {
    return {};
  }
  const kept: [string, KeyStat][] = [];
  for (const key of Object.keys(raw)) {
    const stat = [...key].length >= 1 && [...key].length <= LONGEST_KEY ? sanitizeStat(raw[key]) : undefined;
    if (stat !== undefined && kept.length < MAX_KEYS) {
      kept.push([key, stat]);
    }
  }
  return Object.fromEntries(kept);
}
