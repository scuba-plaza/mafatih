import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Tier } from "~/engine/corpus/normalize.ts";
import { countsTowardProgress, type Lesson, type LessonKind } from "~/engine/lessons/lesson.ts";
import {
  aggregate,
  buildLesson,
  type Checkpoint,
  finishedAyat,
  type Start,
  seedFromQuery,
  startSession,
  tierOf,
} from "~/engine/plan.ts";
import {
  clampPosition,
  emptyRecitation,
  passageAfter,
  passageBefore,
  type Recitation,
  type RecitationPosition,
  recordAyat,
  resumeOf,
  type SurahCompletion,
} from "~/engine/recitation/recitation.ts";
import {
  applyKey,
  metrics as computeMetrics,
  isComplete,
  type SessionState,
  tallySince,
} from "~/engine/session/session.ts";
import { advanceProgress, DEFAULT_UNLOCK_CONFIG } from "~/engine/stats/unlock.ts";
import { useLatest } from "~/hooks/useLatest.ts";
import type { Target } from "~/hooks/useRoute.ts";
import { type TypingKeyHandlers, useTypingKeys } from "~/hooks/useTypingKeys.ts";
import {
  defaultProfile,
  loadProfile,
  type Profile,
  pushHistory,
  type SessionSummary,
  type Settings,
  saveProfile,
} from "~/storage/profile.ts";

const LESSON_SETTINGS: Record<LessonKind, readonly (keyof Settings)[]> = {
  adaptive: ["tierOverride"],
  recite: ["tierOverride", "ayatPerLesson"],
  custom: ["tierOverride", "customText"],
};

export interface Trainer {
  profile: Profile;
  lesson: Lesson;
  session: SessionState;
  effectiveTier: Tier;
  latinDetected: boolean;
  lastSummary: SessionSummary | null;
  shiftHeld: boolean;
  completion: SurahCompletion | null;
  reviewing: boolean;
  dismissLatin: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProfile: () => void;
  goTo: (position: RecitationPosition, redo?: boolean) => void;
  redoPassage: () => void;
  nextPassage: () => void;
  previousPassage: () => void;
  dismissCompletion: () => void;
  replaySurah: () => void;
  resetRecitation: () => void;
}

export interface TrainerOptions {
  target: Target | null;
  enabled: boolean;
}

function positionOf(recitation: Recitation, surah: number, ayah: number | null): RecitationPosition {
  const clamped = clampPosition({ surah, ayah: 1 }).surah;
  return clampPosition({ surah: clamped, ayah: ayah ?? resumeOf(recitation, clamped) });
}

function atPosition(profile: Profile, position: RecitationPosition): Profile {
  return { ...profile, recitation: { ...profile.recitation, position } };
}

function randomSeed(): number {
  const fromQuery = typeof window === "undefined" ? null : seedFromQuery(window.location.search);
  return fromQuery ?? Math.floor(Math.random() * 1e9);
}

export function useTrainer({ target, enabled }: TrainerOptions): Trainer {
  const [profile, setProfile] = useState<Profile>(() => {
    const loaded = loadProfile();
    return target?.mode === "recite"
      ? atPosition(loaded, positionOf(loaded.recitation, target.surah, target.ayah))
      : loaded;
  });
  const [latinDetected, setLatinDetected] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [completion, setCompletion] = useState<SurahCompletion | null>(null);
  const baseSeed = useRef(randomSeed());
  const lessonCounter = useRef(0);

  const [initial] = useState(() => {
    const first = buildLesson(profile, target?.mode ?? "adaptive", baseSeed.current);
    return { lesson: first, ...startSession(profile, first, false) };
  });
  const [lesson, setLesson] = useState<Lesson>(initial.lesson);
  const [session, setSession] = useState<SessionState>(initial.session);
  const [reviewing, setReviewing] = useState(initial.reviewing);
  const checkpointRef = useRef<Checkpoint>({ cursor: initial.session.origin, record: 0 });

  const profileRef = useLatest(profile);
  const lessonRef = useLatest(lesson);
  const reviewingRef = useLatest(reviewing);
  const completionRef = useLatest(completion);

  const commit = useCallback(
    (updated: Profile) => {
      profileRef.current = updated;
      saveProfile(updated);
      setProfile(updated);
    },
    [profileRef],
  );

  const begin = useCallback((next: Lesson, started: Start) => {
    checkpointRef.current = { cursor: started.session.origin, record: 0 };
    setLesson(next);
    setSession(started.session);
    setReviewing(started.reviewing);
  }, []);

  const regenerate = useCallback(
    (source: Profile, mode: LessonKind, redo = false) => {
      lessonCounter.current += 1;
      const next = buildLesson(source, mode, baseSeed.current + lessonCounter.current);
      begin(next, startSession(source, next, redo));
    },
    [begin],
  );

  const scoreSince = useCallback(
    (state: SessionState, extra: Partial<Profile> = {}) => {
      const current = profileRef.current;
      const stats = aggregate(current.stats, state.records.slice(Math.max(1, checkpointRef.current.record)));
      checkpointRef.current = { cursor: state.cursor, record: state.records.length };
      commit({
        ...current,
        ...extra,
        stats,
        progress: advanceProgress(stats, current.progress, DEFAULT_UNLOCK_CONFIG),
      });
    },
    [commit, profileRef],
  );

  const finish = useCallback(
    (finished: SessionState) => {
      const current = profileRef.current;
      const m = computeMetrics(finished);
      const summary: SessionSummary = {
        at: Date.now(),
        cpm: m.cpm,
        accuracy: m.accuracy,
        errors: m.errors,
        chars: m.typedChars,
        tier: tierOf(current),
      };
      setLastSummary(summary);
      if (countsTowardProgress(lessonRef.current.source)) {
        scoreSince(finished, { history: pushHistory(current.history, summary) });
      }
    },
    [profileRef, lessonRef, scoreSince],
  );

  const checkpoint = useCallback(
    (state: SessionState): SurahCompletion | null => {
      const current = lessonRef.current;
      const { surah, fromAyah, toAyah } = current.source;
      if (reviewingRef.current || surah === undefined || fromAyah === undefined || toAyah === undefined) {
        return null;
      }
      const mark = checkpointRef.current;
      const finished = finishedAyat(current, mark.cursor, state.cursor);
      const first = finished[0];
      const last = finished[finished.length - 1];
      if (first === undefined || last === undefined) {
        return null;
      }
      const update = recordAyat(
        profileRef.current.recitation,
        { surah, from: first.ayah, to: last.ayah, passageFrom: fromAyah, passageTo: toAyah },
        { at: Date.now(), ...tallySince(state, mark.cursor, mark.record) },
        profileRef.current.settings.surahOrder,
      );
      scoreSince(state, { recitation: update.recitation });
      if (update.completion !== null) {
        setCompletion(update.completion);
      }
      return update.completion;
    },
    [profileRef, lessonRef, reviewingRef, scoreSince],
  );

  const settledRef = useRef<SessionState | null>(null);
  useEffect(() => {
    const completed = checkpoint(session);
    if ((!isComplete(session) && completed === null) || settledRef.current === session) {
      return;
    }
    settledRef.current = session;
    finish(session);
    regenerate(profileRef.current, lessonRef.current.source.kind);
  }, [session, checkpoint, finish, regenerate, profileRef, lessonRef]);

  const goTo = useCallback(
    (position: RecitationPosition, redo = false) => {
      const updated = atPosition(profileRef.current, clampPosition(position));
      commit(updated);
      regenerate(updated, "recite", redo);
    },
    [commit, regenerate, profileRef],
  );

  const mode = target?.mode ?? null;
  const surah = target?.mode === "recite" ? target.surah : null;
  const ayah = target?.mode === "recite" ? target.ayah : null;
  useLayoutEffect(() => {
    const { source } = lessonRef.current;
    if (mode === "recite" && surah !== null) {
      const position = positionOf(profileRef.current.recitation, surah, ayah);
      if (source.kind !== "recite" || source.surah !== position.surah || source.fromAyah !== position.ayah) {
        goTo(position);
      }
    } else if (mode !== null && mode !== source.kind) {
      regenerate(profileRef.current, mode);
    }
  }, [mode, surah, ayah, goTo, regenerate, lessonRef, profileRef]);

  const redoPassage = useCallback(() => {
    begin(lessonRef.current, startSession(profileRef.current, lessonRef.current, true));
  }, [begin, lessonRef, profileRef]);

  const stepPassage = useCallback(
    (direction: 1 | -1): boolean => {
      const { source } = lessonRef.current;
      const { settings } = profileRef.current;
      if (source.kind !== "recite" || source.surah === undefined) {
        return false;
      }
      goTo(
        direction === 1
          ? passageAfter(source.surah, source.toAyah ?? 1, settings.surahOrder)
          : passageBefore(source.surah, source.fromAyah ?? 1, settings.ayatPerLesson, settings.surahOrder),
      );
      return true;
    },
    [goTo, lessonRef, profileRef],
  );

  const nextPassage = useCallback(() => {
    stepPassage(1);
  }, [stepPassage]);

  const previousPassage = useCallback(() => {
    stepPassage(-1);
  }, [stepPassage]);

  const keys = useLatest<TypingKeyHandlers>({
    listening: enabled && completion === null,
    typing: !reviewing,
    onKey: (key, at) => setSession((current) => (isComplete(current) ? current : applyKey(current, key, at))),
    onStep: stepPassage,
    onLatin: () => setLatinDetected(true),
    onShift: setShiftHeld,
  });
  useTypingKeys(keys);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const previous = profileRef.current.settings;
      const updated: Profile = { ...profileRef.current, settings: { ...previous, ...patch } };
      commit(updated);
      const { kind } = lessonRef.current.source;
      if (LESSON_SETTINGS[kind].some((key) => updated.settings[key] !== previous[key])) {
        regenerate(updated, kind);
      }
    },
    [commit, regenerate, profileRef, lessonRef],
  );

  const resetProfile = useCallback(() => {
    const { settings, recitation } = profileRef.current;
    const fresh: Profile = { ...defaultProfile(), settings, recitation };
    commit(fresh);
    setLastSummary(null);
    regenerate(fresh, lessonRef.current.source.kind);
  }, [commit, regenerate, profileRef, lessonRef]);

  const resetRecitation = useCallback(() => {
    const current = profileRef.current;
    const updated: Profile = { ...current, recitation: emptyRecitation(current.settings.surahOrder) };
    commit(updated);
    setCompletion(null);
    if (lessonRef.current.source.kind === "recite") {
      regenerate(updated, "recite");
    }
  }, [commit, regenerate, profileRef, lessonRef]);

  const dismissCompletion = useCallback(() => setCompletion(null), []);

  const replaySurah = useCallback(() => {
    const surah = completionRef.current?.surah;
    setCompletion(null);
    if (surah !== undefined) {
      goTo({ surah, ayah: 1 }, true);
    }
  }, [goTo, completionRef]);

  const dismissLatin = useCallback(() => setLatinDetected(false), []);

  return {
    profile,
    lesson,
    session,
    effectiveTier: tierOf(profile),
    latinDetected,
    lastSummary,
    shiftHeld,
    completion,
    reviewing,
    dismissLatin,
    updateSettings,
    resetProfile,
    goTo,
    redoPassage,
    nextPassage,
    previousPassage,
    dismissCompletion,
    replaySurah,
    resetRecitation,
  };
}
