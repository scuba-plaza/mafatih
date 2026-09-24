import { generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";
import { createRng } from "~/engine/lessons/rng.ts";
import { applyKey, createSession } from "~/engine/session/session.ts";
import { emptyStats, type KeyStats, recordKeystroke } from "~/engine/stats/keystats.ts";
import {
  advanceProgress,
  DEFAULT_UNLOCK_CONFIG,
  focusLetter,
  initialProgress,
  type Progress,
} from "~/engine/stats/unlock.ts";

export interface Learner {
  msPerKey: number;
  errorRate: (lesson: number) => number;
}

export interface Practice {
  progress: Progress;
  stats: KeyStats;
  unlockedAfter: readonly number[];
}

const WRONG_KEY = "#";

export function practise(learner: Learner, lessons: number, seed: number): Practice {
  const rng = createRng(seed);
  let progress = initialProgress();
  let stats = emptyStats();
  let clock = 0;
  const unlockedAfter: number[] = [];

  for (let lesson = 0; lesson < lessons; lesson += 1) {
    const text = generateAdaptiveLesson({
      unlockedCount: progress.unlockedCount,
      tier: progress.tier,
      seed: seed * 10_000 + lesson,
      focusLetter: focusLetter(progress),
    }).text;
    let session = createSession(text);
    for (const char of session.chars) {
      clock += learner.msPerKey * (0.6 + rng.next() * 0.8);
      if (rng.next() < learner.errorRate(lesson)) {
        session = applyKey(session, WRONG_KEY, clock);
        clock += learner.msPerKey;
      }
      session = applyKey(session, char, clock);
    }
    clock += 1000;
    stats = session.records
      .slice(1)
      .reduce((next, record) => recordKeystroke(next, record.expected, record.latencyMs, record.correct), stats);
    progress = advanceProgress(stats, progress, DEFAULT_UNLOCK_CONFIG);
    unlockedAfter.push(progress.unlockedCount);
  }

  return { progress, stats, unlockedAfter };
}
