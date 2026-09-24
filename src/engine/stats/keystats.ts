export interface KeyStat {
  char: string;
  samples: number;
  meanMs: number;
  hits: number;
  misses: number;
  recentAccuracy: number;
}

export type KeyStats = Readonly<Record<string, KeyStat>>;

const EWMA_ALPHA = 0.25;

export const RECENT_ACCURACY_ALPHA = 0.05;

export const LATENCY_CAP_MS = 3000;

export function isPause(latencyMs: number): boolean {
  return latencyMs > LATENCY_CAP_MS;
}

export function emptyStats(): KeyStats {
  return {};
}

export function statFor(stats: KeyStats, char: string): KeyStat {
  return stats[char] ?? { char, samples: 0, meanMs: 0, hits: 0, misses: 0, recentAccuracy: 1 };
}

export function recordKeystroke(stats: KeyStats, char: string, latencyMs: number, correct: boolean): KeyStats {
  const prev = statFor(stats, char);
  const rate = Math.max(RECENT_ACCURACY_ALPHA, 1 / (attemptsOf(prev) + 1));
  const timed = correct && !isPause(latencyMs);
  const meanMs = timed
    ? prev.samples === 0
      ? latencyMs
      : EWMA_ALPHA * latencyMs + (1 - EWMA_ALPHA) * prev.meanMs
    : prev.meanMs;
  const next: KeyStat = {
    char,
    samples: prev.samples + (timed ? 1 : 0),
    meanMs,
    hits: prev.hits + (correct ? 1 : 0),
    misses: prev.misses + (correct ? 0 : 1),
    recentAccuracy: prev.recentAccuracy + rate * ((correct ? 1 : 0) - prev.recentAccuracy),
  };
  return { ...stats, [char]: next };
}

export function accuracyOf(stat: KeyStat): number {
  const total = stat.hits + stat.misses;
  return total === 0 ? 0 : stat.hits / total;
}

export function recentAccuracyOf(stat: KeyStat): number {
  return attemptsOf(stat) === 0 ? 0 : stat.recentAccuracy;
}

export function attemptsOf(stat: KeyStat): number {
  return stat.hits + stat.misses;
}

export function isMastered(stat: KeyStat, minSamples: number, targetMs: number, minAccuracy: number): boolean {
  return (
    stat.samples >= minSamples && stat.meanMs > 0 && stat.meanMs <= targetMs && recentAccuracyOf(stat) >= minAccuracy
  );
}

function finite(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

export function sanitizeStat(char: string, raw: unknown): KeyStat {
  if (typeof raw !== "object" || raw === null) {
    return statFor({}, char);
  }
  const record = raw as Record<string, unknown>;
  const hits = finite(record.hits, 0);
  const misses = finite(record.misses, 0);
  const lifetime = hits + misses === 0 ? 1 : hits / (hits + misses);
  return {
    char,
    samples: finite(record.samples, hits),
    meanMs: finite(record.meanMs, 0),
    hits,
    misses,
    recentAccuracy: Math.min(1, finite(record.recentAccuracy, lifetime)),
  };
}

export function sanitizeStats(raw: unknown): KeyStats {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return emptyStats();
  }
  const out: Record<string, KeyStat> = {};
  for (const [char, value] of Object.entries(raw)) {
    out[char] = sanitizeStat(char, value);
  }
  return out;
}
