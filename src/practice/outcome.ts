import { type KeyStats, recordSample } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import { advance, DEFAULT_UNLOCK_CONFIG, type LadderProgress, type UnlockConfig } from "./ladder.ts";

export interface PracticeState {
  readonly stats: KeyStats;
  readonly progress: LadderProgress;
}

export function applyPracticeLesson(
  state: PracticeState,
  samples: readonly Sample[],
  config: UnlockConfig = DEFAULT_UNLOCK_CONFIG,
): PracticeState {
  const stats = samples.reduce(recordSample, state.stats);
  return { stats, progress: advance(stats, state.progress, config) };
}
