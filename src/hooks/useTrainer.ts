import { useCallback, useEffect, useRef, useState } from "react";
import type { Tier } from "~/engine/corpus/normalize.ts";
import { generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";
import { generateCustomLesson } from "~/engine/lessons/custom.ts";
import { countsTowardProgress, type Lesson } from "~/engine/lessons/lesson.ts";
import { generateRecitePassage } from "~/engine/lessons/recite.ts";
import {
  clampPosition,
  emptyRecitation,
  passageAfter,
  passageBefore,
  passageStatus,
  type RecitationPosition,
  recordAyat,
  type SurahCompletion,
} from "~/engine/recitation/recitation.ts";
import {
  activeMsBetween,
  applyKey,
  metrics as computeMetrics,
  createSession,
  isComplete,
  isTypedKey,
  type KeystrokeRecord,
  type SessionState,
} from "~/engine/session/session.ts";
import { type KeyStats, recordKeystroke } from "~/engine/stats/keystats.ts";
import { advanceProgress, DEFAULT_UNLOCK_CONFIG, focusLetter } from "~/engine/stats/unlock.ts";
import { useLatest } from "~/hooks/useLatest.ts";
import {
  defaultProfile,
  loadProfile,
  type Profile,
  pushHistory,
  type SessionSummary,
  type Settings,
  saveProfile,
} from "~/storage/profile.ts";

const LATIN = /^[A-Za-z]$/;

const PREVENTED_KEYS: readonly string[] = [" ", "Backspace", "Tab"];

const PASSTHROUGH_TAGS: readonly string[] = ["INPUT", "SELECT", "TEXTAREA", "BUTTON"];

const LESSON_SETTINGS: readonly (keyof Settings)[] = ["mode", "tierOverride", "ayatPerLesson", "customText"];

const PASSAGE_KEYS: Readonly<Record<string, 1 | -1>> = { PageDown: 1, PageUp: -1 };

function seedFromLocation(): number | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = new URLSearchParams(window.location.search).get("seed");
  if (raw === null) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function tierOf(profile: Profile): Tier {
  return profile.settings.tierOverride ?? profile.progress.tier;
}

function buildLesson(profile: Profile, seed: number): Lesson {
  const { settings } = profile;
  const tier = tierOf(profile);
  if (settings.mode === "recite") {
    const { surah, ayah } = profile.recitation.position;
    return generateRecitePassage({ surah, fromAyah: ayah, tier, maxAyat: settings.ayatPerLesson });
  }
  if (settings.mode === "custom") {
    return generateCustomLesson({ text: settings.customText, tier });
  }
  return generateAdaptiveLesson({
    unlockedCount: profile.progress.unlockedCount,
    tier,
    seed,
    focusLetter: focusLetter(profile.progress),
  });
}

function aggregate(stats: KeyStats, records: readonly KeystrokeRecord[]): KeyStats {
  return records.reduce(
    (next, record) => recordKeystroke(next, record.expected, record.latencyMs, record.correct),
    stats,
  );
}

interface Start {
  session: SessionState;
  reviewing: boolean;
}

function startSession(profile: Profile, lesson: Lesson, redo: boolean): Start {
  const { surah, fromAyah, toAyah, kind } = lesson.source;
  if (kind !== "recite" || surah === undefined || fromAyah === undefined || toAyah === undefined) {
    return { session: createSession(lesson.text), reviewing: false };
  }
  const status = passageStatus(profile.recitation, surah, fromAyah, toAyah);
  if (status.done && !redo) {
    return { session: createSession(lesson.text, lesson.text.length), reviewing: true };
  }
  if (status.done) {
    return { session: createSession(lesson.text), reviewing: false };
  }
  const next = lesson.ayat.find((span) => span.ayah === status.typedThrough + 1);
  return {
    session: createSession(lesson.text, status.typedThrough >= fromAyah ? (next?.start ?? 0) : 0),
    reviewing: false,
  };
}

interface Checkpoint {
  cursor: number;
  record: number;
}

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
  enabled?: boolean;
}

export function useTrainer(options: TrainerOptions = {}): Trainer {
  const enabled = options.enabled ?? true;
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const lessonCounter = useRef(0);
  const [latinDetected, setLatinDetected] = useState(false);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [completion, setCompletion] = useState<SurahCompletion | null>(null);
  const baseSeed = useRef(seedFromLocation() ?? Math.floor(Math.random() * 1e9));

  const profileRef = useLatest(profile);
  const enabledRef = useLatest(enabled);
  const completionRef = useLatest(completion);

  const [initial] = useState(() => {
    const first = buildLesson(profile, baseSeed.current);
    return { lesson: first, ...startSession(profile, first, false) };
  });
  const [lesson, setLesson] = useState<Lesson>(initial.lesson);
  const [session, setSession] = useState<SessionState>(initial.session);
  const [reviewing, setReviewing] = useState(initial.reviewing);
  const lessonRef = useLatest(lesson);
  const reviewingRef = useLatest(reviewing);
  const checkpointRef = useRef<Checkpoint>({ cursor: initial.session.origin, record: 0 });

  const begin = useCallback((next: Lesson, started: Start) => {
    checkpointRef.current = { cursor: started.session.origin, record: 0 };
    setLesson(next);
    setSession(started.session);
    setReviewing(started.reviewing);
  }, []);

  const regenerate = useCallback(
    (source: Profile, redo = false) => {
      lessonCounter.current += 1;
      const next = buildLesson(source, baseSeed.current + lessonCounter.current);
      begin(next, startSession(source, next, redo));
    },
    [begin],
  );

  const pendingRecords = useCallback((state: SessionState): KeystrokeRecord[] => {
    const from = checkpointRef.current.record;
    return state.records.slice(Math.max(1, from));
  }, []);

  const commit = useCallback(
    (updated: Profile) => {
      profileRef.current = updated;
      saveProfile(updated);
      setProfile(updated);
    },
    [profileRef],
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
      if (!countsTowardProgress(lessonRef.current.source)) {
        return;
      }
      const stats = aggregate(current.stats, pendingRecords(finished));
      checkpointRef.current = { cursor: finished.cursor, record: finished.records.length };
      commit({
        ...current,
        stats,
        progress: advanceProgress(stats, current.progress, DEFAULT_UNLOCK_CONFIG),
        history: pushHistory(current.history, summary),
      });
    },
    [commit, profileRef, lessonRef, pendingRecords],
  );

  const checkpoint = useCallback(
    (state: SessionState): SurahCompletion | null => {
      const { source, ayat } = lessonRef.current;
      const { surah, fromAyah, toAyah } = source;
      if (
        reviewingRef.current ||
        source.kind !== "recite" ||
        surah === undefined ||
        fromAyah === undefined ||
        toAyah === undefined
      ) {
        return null;
      }
      const mark = checkpointRef.current;
      const finished = ayat.filter((span) => span.end <= state.cursor && span.end > mark.cursor);
      const first = finished[0];
      const last = finished[finished.length - 1];
      if (first === undefined || last === undefined) {
        return null;
      }
      const current = profileRef.current;
      const records = pendingRecords(state);
      const stats = aggregate(current.stats, records);
      const update = recordAyat(
        current.recitation,
        { surah, from: first.ayah, to: last.ayah, passageFrom: fromAyah, passageTo: toAyah },
        {
          at: Date.now(),
          chars: state.cursor - mark.cursor,
          keystrokes: state.records.length - mark.record,
          errors: state.records.slice(mark.record).filter((record) => !record.correct).length,
          elapsedMs: activeMsBetween(state, mark.record, state.records.length),
        },
        current.settings.surahOrder,
      );
      checkpointRef.current = { cursor: state.cursor, record: state.records.length };
      commit({
        ...current,
        stats,
        progress: advanceProgress(stats, current.progress, DEFAULT_UNLOCK_CONFIG),
        recitation: update.recitation,
      });
      if (update.completion !== null) {
        setCompletion(update.completion);
      }
      return update.completion;
    },
    [commit, profileRef, lessonRef, reviewingRef, pendingRecords],
  );

  const settledRef = useRef<SessionState | null>(null);
  useEffect(() => {
    const completed = checkpoint(session);
    if ((!isComplete(session) && completed === null) || settledRef.current === session) {
      return;
    }
    settledRef.current = session;
    finish(session);
    regenerate(profileRef.current);
  }, [session, checkpoint, finish, regenerate, profileRef]);

  const goTo = useCallback(
    (position: RecitationPosition, redo = false) => {
      const current = profileRef.current;
      const updated: Profile = {
        ...current,
        settings: current.settings.mode === "recite" ? current.settings : { ...current.settings, mode: "recite" },
        recitation: { ...current.recitation, position: clampPosition(position) },
      };
      commit(updated);
      regenerate(updated, redo);
    },
    [commit, regenerate, profileRef],
  );

  const redoPassage = useCallback(() => {
    begin(lessonRef.current, startSession(profileRef.current, lessonRef.current, true));
  }, [begin, lessonRef, profileRef]);

  const stepPassage = useCallback(
    (direction: 1 | -1) => {
      const { source } = lessonRef.current;
      const { settings } = profileRef.current;
      if (source.kind !== "recite" || source.surah === undefined) {
        return;
      }
      const target =
        direction === 1
          ? passageAfter(source.surah, source.toAyah ?? 1, settings.surahOrder)
          : passageBefore(source.surah, source.fromAyah ?? 1, settings.ayatPerLesson, settings.surahOrder);
      goTo(target);
    },
    [goTo, lessonRef, profileRef],
  );

  const nextPassage = useCallback(() => stepPassage(1), [stepPassage]);
  const previousPassage = useCallback(() => stepPassage(-1), [stepPassage]);
  const stepPassageRef = useLatest(stepPassage);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current || completionRef.current !== null || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      const direction = PASSAGE_KEYS[event.key];
      if (direction !== undefined) {
        if (lessonRef.current.source.kind === "recite") {
          event.preventDefault();
          stepPassageRef.current(direction);
        }
        return;
      }
      if (event.key === "Shift") {
        setShiftHeld(true);
        return;
      }
      const target = event.target;
      if (target instanceof HTMLElement && PASSTHROUGH_TAGS.includes(target.tagName)) {
        return;
      }
      if (reviewingRef.current) {
        return;
      }
      if (LATIN.test(event.key)) {
        event.preventDefault();
        setLatinDetected(true);
        return;
      }
      if (PREVENTED_KEYS.includes(event.key)) {
        event.preventDefault();
      }
      if (!isTypedKey(event.key)) {
        return;
      }

      setSession((current) => (isComplete(current) ? current : applyKey(current, event.key, event.timeStamp)));
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        setShiftHeld(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [enabledRef, completionRef, lessonRef, reviewingRef, stepPassageRef]);

  const updateSettings = useCallback(
    (patch: Partial<Settings>) => {
      const previous = profileRef.current.settings;
      const updated: Profile = { ...profileRef.current, settings: { ...previous, ...patch } };
      commit(updated);
      if (LESSON_SETTINGS.some((key) => updated.settings[key] !== previous[key])) {
        regenerate(updated);
      }
    },
    [commit, regenerate, profileRef],
  );

  const resetProfile = useCallback(() => {
    const { settings, recitation } = profileRef.current;
    const fresh: Profile = { ...defaultProfile(), settings, recitation };
    commit(fresh);
    setLastSummary(null);
    regenerate(fresh);
  }, [commit, regenerate, profileRef]);

  const resetRecitation = useCallback(() => {
    const current = profileRef.current;
    const updated: Profile = { ...current, recitation: emptyRecitation(current.settings.surahOrder) };
    commit(updated);
    setCompletion(null);
    if (current.settings.mode === "recite") {
      regenerate(updated);
    }
  }, [commit, regenerate, profileRef]);

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
