import { useCallback, useEffect, useRef, useState } from "react";
import type { Tier } from "~/engine/corpus/normalize.ts";
import { generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";
import { generateCustomLesson } from "~/engine/lessons/custom.ts";
import { countsTowardProgress, type Lesson } from "~/engine/lessons/lesson.ts";
import { generateRecitePassage } from "~/engine/lessons/recite.ts";
import {
  applyKey,
  metrics as computeMetrics,
  createSession,
  isComplete,
  isTypedKey,
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

const LESSON_SETTINGS: readonly (keyof Settings)[] = ["mode", "tierOverride", "surah", "ayatPerLesson", "customText"];

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
    return generateRecitePassage({ surah: settings.surah, tier, maxAyat: settings.ayatPerLesson });
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

function aggregate(stats: KeyStats, session: SessionState): KeyStats {
  return session.records
    .slice(1)
    .reduce((next, record) => recordKeystroke(next, record.expected, record.latencyMs, record.correct), stats);
}

export interface Trainer {
  profile: Profile;
  lesson: Lesson;
  session: SessionState;
  effectiveTier: Tier;
  latinDetected: boolean;
  lastSummary: SessionSummary | null;
  shiftHeld: boolean;
  dismissLatin: () => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetProfile: () => void;
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
  const baseSeed = useRef(seedFromLocation() ?? Math.floor(Math.random() * 1e9));

  const profileRef = useLatest(profile);
  const enabledRef = useLatest(enabled);

  const [lesson, setLesson] = useState<Lesson>(() => buildLesson(profile, baseSeed.current));
  const [session, setSession] = useState<SessionState>(() => createSession(lesson.text));
  const lessonRef = useLatest(lesson);

  const regenerate = useCallback((source: Profile) => {
    lessonCounter.current += 1;
    const next = buildLesson(source, baseSeed.current + lessonCounter.current);
    setLesson(next);
    setSession(createSession(next.text));
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
      const stats = aggregate(current.stats, finished);
      commit({
        ...current,
        stats,
        progress: advanceProgress(stats, current.progress, DEFAULT_UNLOCK_CONFIG),
        history: pushHistory(current.history, summary),
      });
    },
    [commit, profileRef, lessonRef],
  );

  const settledRef = useRef<SessionState | null>(null);
  useEffect(() => {
    if (!isComplete(session) || settledRef.current === session) {
      return;
    }
    settledRef.current = session;
    finish(session);
    regenerate(profileRef.current);
  }, [session, finish, regenerate, profileRef]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!enabledRef.current || event.ctrlKey || event.altKey || event.metaKey) {
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
  }, [enabledRef]);

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
    const fresh: Profile = { ...defaultProfile(), settings: profileRef.current.settings };
    commit(fresh);
    setLastSummary(null);
    regenerate(fresh);
  }, [commit, regenerate, profileRef]);

  const dismissLatin = useCallback(() => setLatinDetected(false), []);

  return {
    profile,
    lesson,
    session,
    effectiveTier: tierOf(profile),
    latinDetected,
    lastSummary,
    shiftHeld,
    dismissLatin,
    updateSettings,
    resetProfile,
  };
}
