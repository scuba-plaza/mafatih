import { type KeyStats, recordSample } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import type { SurahOrder } from "./order.ts";
import { type Position, type RecitationProgress, recordAyah } from "./progress.ts";

export interface RecitationState {
  readonly stats: KeyStats;
  readonly recitation: RecitationProgress;
}

export function applyRecitationAyah(
  state: RecitationState,
  position: Position,
  samples: readonly Sample[],
  order: SurahOrder,
): RecitationState {
  const { progress } = recordAyah(state.recitation, position, order);
  const recorded = progress !== state.recitation;
  return { stats: recorded ? samples.reduce(recordSample, state.stats) : state.stats, recitation: progress };
}
