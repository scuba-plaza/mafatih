import type { Tier } from "~/engine/corpus/normalize.ts";
import { generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";
import { generateCustomLesson } from "~/engine/lessons/custom.ts";
import type { AyahSpan, Lesson, LessonKind } from "~/engine/lessons/lesson.ts";
import { generateRecitePassage } from "~/engine/lessons/recite.ts";
import { passageStatus } from "~/engine/recitation/recitation.ts";
import { createSession, type KeystrokeRecord, type SessionState } from "~/engine/session/session.ts";
import { type KeyStats, recordKeystroke } from "~/engine/stats/keystats.ts";
import { focusLetter } from "~/engine/stats/unlock.ts";
import type { Profile } from "~/storage/profile.ts";

export interface Start {
  session: SessionState;
  reviewing: boolean;
}

export interface Checkpoint {
  cursor: number;
  record: number;
}

export function seedFromQuery(search: string): number | null {
  const raw = new URLSearchParams(search).get("seed");
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function tierOf(profile: Profile): Tier {
  return profile.settings.tierOverride ?? profile.progress.tier;
}

export function buildLesson(profile: Profile, mode: LessonKind, seed: number): Lesson {
  const { settings } = profile;
  const tier = tierOf(profile);
  if (mode === "recite") {
    const { surah, ayah } = profile.recitation.position;
    return generateRecitePassage({ surah, fromAyah: ayah, tier, maxAyat: settings.ayatPerLesson });
  }
  if (mode === "custom") {
    return generateCustomLesson({ text: settings.customText, tier });
  }
  return generateAdaptiveLesson({
    unlockedCount: profile.progress.unlockedCount,
    tier,
    seed,
    focusLetter: focusLetter(profile.progress),
  });
}

export function startSession(profile: Profile, lesson: Lesson, redo: boolean): Start {
  const { surah, fromAyah, toAyah, kind } = lesson.source;
  if (kind !== "recite" || surah === undefined || fromAyah === undefined || toAyah === undefined) {
    return { session: createSession(lesson.text), reviewing: false };
  }
  const status = passageStatus(profile.recitation, surah, fromAyah, toAyah);
  if (status.done) {
    return redo
      ? { session: createSession(lesson.text), reviewing: false }
      : { session: createSession(lesson.text, lesson.text.length), reviewing: true };
  }
  if (status.typedThrough < fromAyah) {
    return { session: createSession(lesson.text), reviewing: false };
  }
  const resume = lesson.ayat.find((span) => span.ayah === status.typedThrough + 1);
  return { session: createSession(lesson.text, resume?.start ?? 0), reviewing: false };
}

export function finishedAyat(lesson: Lesson, since: number, cursor: number): AyahSpan[] {
  return lesson.ayat.filter((span) => span.end <= cursor && span.end > since);
}

export function aggregate(stats: KeyStats, records: readonly KeystrokeRecord[]): KeyStats {
  return records.reduce(
    (next, record) => recordKeystroke(next, record.expected, record.latencyMs, record.correct),
    stats,
  );
}
