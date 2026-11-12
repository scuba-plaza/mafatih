import { type KeyStats, recordSample } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import {
  advance,
  DEFAULT_UNLOCK_CONFIG,
  focusRung,
  type LadderProgress,
  type Rung,
  type UnlockConfig,
} from "./ladder.ts";

export interface PracticeState {
  readonly stats: KeyStats;
  readonly progress: LadderProgress;
}

interface PracticeOutcome extends PracticeState {
  readonly unlocked: Rung | undefined;
}

export function applyPracticeLesson(
  state: PracticeState,
  samples: readonly Sample[],
  config: UnlockConfig = DEFAULT_UNLOCK_CONFIG,
): PracticeOutcome {
  const stats = samples.reduce(recordSample, state.stats);
  const progress = advance(stats, state.progress, config);
  return { stats, progress, unlocked: progress === state.progress ? undefined : focusRung(progress) };
}
