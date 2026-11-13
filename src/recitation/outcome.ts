import { type KeyStats, recordSample } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import type { SurahOrder } from "./order.ts";
import {
  addTally,
  completionsOf,
  type Position,
  type RecitationProgress,
  type RunTally,
  recordAyah,
  runOf,
} from "./progress.ts";

export interface RecitationState {
  readonly stats: KeyStats;
  readonly recitation: RecitationProgress;
}

export interface RecitationOutcome extends RecitationState {
  readonly finished: RunTally | null;
}

function tallyOf(samples: readonly Sample[]): RunTally {
  return {
    correct: samples.filter((sample) => sample.correct).length,
    total: samples.length,
    ms: Math.round(samples.reduce((sum, sample) => sum + (sample.latencyMs ?? 0), 0)),
  };
}

export function applyRecitationAyah(
  state: RecitationState,
  position: Position,
  samples: readonly Sample[],
  order: SurahOrder,
): RecitationOutcome {
  const tally = tallyOf(samples);
  const progress = recordAyah(state.recitation, position, order, tally);
  const recorded = progress !== state.recitation;
  const completed = completionsOf(progress, position.surah) > completionsOf(state.recitation, position.surah);
  return {
    stats: recorded ? samples.reduce(recordSample, state.stats) : state.stats,
    recitation: progress,
    finished: completed ? addTally(runOf(state.recitation, position.surah), tally) : null,
  };
}
