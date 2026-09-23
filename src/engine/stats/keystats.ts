export interface KeyStat {
  char: string;
  samples: number;
  meanMs: number;
  hits: number;
  misses: number;
}

export type KeyStats = Readonly<Record<string, KeyStat>>;

const EWMA_ALPHA = 0.25;

export function emptyStats(): KeyStats {
  return {};
}

export function statFor(stats: KeyStats, char: string): KeyStat {
  return stats[char] ?? { char, samples: 0, meanMs: 0, hits: 0, misses: 0 };
}

export function recordKeystroke(stats: KeyStats, char: string, latencyMs: number, correct: boolean): KeyStats {
  const prev = statFor(stats, char);
  const meanMs = correct
    ? prev.samples === 0
      ? latencyMs
      : EWMA_ALPHA * latencyMs + (1 - EWMA_ALPHA) * prev.meanMs
    : prev.meanMs;
  const next: KeyStat = {
    char,
    samples: prev.samples + (correct ? 1 : 0),
    meanMs,
    hits: prev.hits + (correct ? 1 : 0),
    misses: prev.misses + (correct ? 0 : 1),
  };
  return { ...stats, [char]: next };
}

export function accuracyOf(stat: KeyStat): number {
  const total = stat.hits + stat.misses;
  return total === 0 ? 0 : stat.hits / total;
}

export function attemptsOf(stat: KeyStat): number {
  return stat.hits + stat.misses;
}

export function isMastered(stat: KeyStat, minSamples: number, targetMs: number, minAccuracy: number): boolean {
  return stat.samples >= minSamples && stat.meanMs > 0 && stat.meanMs <= targetMs && accuracyOf(stat) >= minAccuracy;
}
