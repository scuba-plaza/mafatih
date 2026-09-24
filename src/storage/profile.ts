import { clampVolume, DEFAULT_RECITER, DEFAULT_VOLUME, isReciterId, type ReciterId } from "~/engine/audio/reciters.ts";
import { isTier, type Tier } from "~/engine/corpus/normalize.ts";
import { clampFontSize, DEFAULT_FONT, DEFAULT_FONT_SIZE, type FontId, isFontId } from "~/engine/fonts.ts";
import { isRecord, nonNegative } from "~/engine/guards.ts";
import { DEFAULT_CUSTOM_TEXT, MAX_CUSTOM_CHARS } from "~/engine/lessons/custom.ts";
import { clampAyatPerLesson, DEFAULT_AYAT_PER_LESSON } from "~/engine/lessons/lesson.ts";
import {
  DEFAULT_SURAH_ORDER,
  emptyRecitation,
  isSurahOrder,
  type Recitation,
  type SurahOrder,
  sanitizeRecitation,
} from "~/engine/recitation/recitation.ts";
import { emptyStats, type KeyStats, sanitizeStats } from "~/engine/stats/keystats.ts";
import { initialProgress, type Progress, sanitizeProgress } from "~/engine/stats/unlock.ts";

export interface Settings {
  tierOverride: Tier | null;
  font: FontId;
  fontSize: number;
  surahOrder: SurahOrder;
  ayatPerLesson: number;
  customText: string;
  showKeyboard: boolean;
  reciter: ReciterId;
  volume: number;
  muted: boolean;
  autoAdvance: boolean;
  loop: boolean;
}

export interface SessionSummary {
  at: number;
  cpm: number;
  accuracy: number;
  errors: number;
  chars: number;
  tier: Tier;
}

export interface Profile {
  progress: Progress;
  stats: KeyStats;
  settings: Settings;
  history: SessionSummary[];
  recitation: Recitation;
}

const MAX_HISTORY = 50;

export const STORAGE_KEY = "mafatih.profile";

export function defaultSettings(): Settings {
  return {
    tierOverride: null,
    font: DEFAULT_FONT,
    fontSize: DEFAULT_FONT_SIZE,
    surahOrder: DEFAULT_SURAH_ORDER,
    ayatPerLesson: DEFAULT_AYAT_PER_LESSON,
    customText: DEFAULT_CUSTOM_TEXT,
    showKeyboard: true,
    reciter: DEFAULT_RECITER,
    volume: DEFAULT_VOLUME,
    muted: false,
    autoAdvance: true,
    loop: false,
  };
}

export function defaultProfile(): Profile {
  return {
    progress: initialProgress(),
    stats: emptyStats(),
    settings: defaultSettings(),
    history: [],
    recitation: emptyRecitation(),
  };
}

export function sanitizeSettings(raw: unknown): Settings {
  const fallback = defaultSettings();
  if (!isRecord(raw)) {
    return fallback;
  }
  return {
    tierOverride: isTier(raw.tierOverride) ? raw.tierOverride : null,
    font: isFontId(raw.font) ? raw.font : fallback.font,
    fontSize: clampFontSize(raw.fontSize),
    surahOrder: isSurahOrder(raw.surahOrder) ? raw.surahOrder : fallback.surahOrder,
    ayatPerLesson: clampAyatPerLesson(raw.ayatPerLesson),
    customText: typeof raw.customText === "string" ? raw.customText.slice(0, MAX_CUSTOM_CHARS) : fallback.customText,
    showKeyboard: typeof raw.showKeyboard === "boolean" ? raw.showKeyboard : fallback.showKeyboard,
    reciter: isReciterId(raw.reciter) ? raw.reciter : fallback.reciter,
    volume: clampVolume(raw.volume),
    muted: typeof raw.muted === "boolean" ? raw.muted : fallback.muted,
    autoAdvance: typeof raw.autoAdvance === "boolean" ? raw.autoAdvance : fallback.autoAdvance,
    loop: typeof raw.loop === "boolean" ? raw.loop : fallback.loop,
  };
}

export function parseProfile(raw: string | null): Profile {
  if (raw === null) {
    return defaultProfile();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return defaultProfile();
  }
  if (!isRecord(parsed)) {
    return defaultProfile();
  }
  return {
    progress: sanitizeProgress(parsed.progress),
    stats: sanitizeStats(parsed.stats),
    settings: sanitizeSettings(parsed.settings),
    history: sanitizeHistory(parsed.history),
    recitation: sanitizeRecitation(parsed.recitation),
  };
}

function sanitizeSummary(raw: unknown): SessionSummary | null {
  if (!isRecord(raw) || !isTier(raw.tier)) {
    return null;
  }
  return {
    at: nonNegative(raw.at, 0),
    cpm: nonNegative(raw.cpm, 0),
    accuracy: Math.min(1, nonNegative(raw.accuracy, 0)),
    errors: nonNegative(raw.errors, 0),
    chars: nonNegative(raw.chars, 0),
    tier: raw.tier,
  };
}

function sanitizeHistory(raw: unknown): SessionSummary[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(sanitizeSummary)
    .filter((entry): entry is SessionSummary => entry !== null)
    .slice(-MAX_HISTORY);
}

export function loadProfile(): Profile {
  if (typeof localStorage === "undefined") {
    return defaultProfile();
  }
  try {
    return parseProfile(localStorage.getItem(STORAGE_KEY));
  } catch {
    return defaultProfile();
  }
}

export function saveProfile(profile: Profile): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    return;
  }
}

export function pushHistory(history: readonly SessionSummary[], entry: SessionSummary): SessionSummary[] {
  return [...history, entry].slice(-MAX_HISTORY);
}
