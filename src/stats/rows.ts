import { LADDER } from "~/practice/ladder.ts";
import type { LessonRecord, Mode } from "./history.ts";
import type { KeyStats } from "./keystats.ts";

export interface KeyRow {
  readonly key: string;
  readonly meanMs: number | null;
  readonly accuracy: number;
  readonly attempts: number;
}

export interface LessonRow {
  readonly at: number;
  readonly mode: Mode;
  readonly cpm: number | null;
  readonly accuracy: number;
}

const RECENT_LESSONS = 10;
const MS_PER_MINUTE = 60_000;

const LADDER_POSITION: ReadonlyMap<string, number> = new Map(LADDER.rungs.map((rung, index) => [rung.char, index]));

function positionOf(key: string): number {
  return LADDER_POSITION.get(key) ?? LADDER.rungs.length;
}

export function keyRows(stats: KeyStats): KeyRow[] {
  return Object.entries(stats)
    .filter(([, stat]) => stat.attempts > 0)
    .map(([key, stat]) => ({
      key,
      meanMs: stat.timed > 0 ? stat.meanMs : null,
      accuracy: stat.hits / stat.attempts,
      attempts: stat.attempts,
    }))
    .sort((a, b) => positionOf(a.key) - positionOf(b.key) || a.key.localeCompare(b.key));
}

export function recentLessons(history: readonly LessonRecord[], count = RECENT_LESSONS): LessonRow[] {
  return history
    .slice(-count)
    .reverse()
    .map(({ at, mode, chars, ms, accuracy }) => ({
      at,
      mode,
      cpm: ms > 0 ? chars / (ms / MS_PER_MINUTE) : null,
      accuracy,
    }));
}
