import { clampVolume, DEFAULT_RECITER, DEFAULT_VOLUME, isReciterId, type ReciterId } from "~/engine/audio/reciters.ts";
import { isTier, type Tier } from "~/engine/corpus/normalize.ts";
import { clampFontSize, DEFAULT_FONT, DEFAULT_FONT_SIZE, type FontId, isFontId } from "~/engine/fonts.ts";
import { DEFAULT_LAYOUT, isLayoutId, type LayoutId } from "~/engine/layout/ara.ts";
import { DEFAULT_CUSTOM_TEXT, MAX_CUSTOM_CHARS } from "~/engine/lessons/custom.ts";
import { clampAyatPerLesson, DEFAULT_AYAT_PER_LESSON } from "~/engine/lessons/lesson.ts";
import { emptyStats, type KeyStats, sanitizeStats } from "~/engine/stats/keystats.ts";
import { initialProgress, type Progress } from "~/engine/stats/unlock.ts";

export type Mode = "adaptive" | "recite" | "custom";

export const MODES: readonly Mode[] = ["adaptive", "recite", "custom"];

export function isMode(value: unknown): value is Mode {
  return typeof value === "string" && (MODES as readonly string[]).includes(value);
}

export interface Settings {
  mode: Mode;
  tierOverride: Tier | null;
  font: FontId;
  fontSize: number;
  surah: number;
  ayatPerLesson: number;
  customText: string;
  layout: LayoutId;
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
  version: number;
  progress: Progress;
  stats: KeyStats;
  settings: Settings;
  history: SessionSummary[];
}

const PROFILE_VERSION = 1;
const MAX_HISTORY = 50;
const SURAH_COUNT = 114;

export const STORAGE_KEY = "mafatih.profile.v1";

export function defaultSettings(): Settings {
  return {
    mode: "adaptive",
    tierOverride: null,
    font: DEFAULT_FONT,
    fontSize: DEFAULT_FONT_SIZE,
    surah: 1,
    ayatPerLesson: DEFAULT_AYAT_PER_LESSON,
    customText: DEFAULT_CUSTOM_TEXT,
    layout: DEFAULT_LAYOUT,
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
    version: PROFILE_VERSION,
    progress: initialProgress(),
    stats: emptyStats(),
    settings: defaultSettings(),
    history: [],
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function sanitizeSettings(raw: unknown): Settings {
  const fallback = defaultSettings();
  if (!isRecord(raw)) {
    return fallback;
  }
  const surah = Number(raw.surah);
  return {
    mode: isMode(raw.mode) ? raw.mode : fallback.mode,
    tierOverride: isTier(raw.tierOverride) ? raw.tierOverride : null,
    font: isFontId(raw.font) ? raw.font : fallback.font,
    fontSize: clampFontSize(raw.fontSize),
    surah: Number.isInteger(surah) && surah >= 1 && surah <= SURAH_COUNT ? surah : fallback.surah,
    ayatPerLesson: clampAyatPerLesson(raw.ayatPerLesson),
    customText: typeof raw.customText === "string" ? raw.customText.slice(0, MAX_CUSTOM_CHARS) : fallback.customText,
    layout: isLayoutId(raw.layout) ? raw.layout : fallback.layout,
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
  if (!isRecord(parsed) || parsed.version !== PROFILE_VERSION) {
    return defaultProfile();
  }

  const fallback = defaultProfile();
  const progress = isRecord(parsed.progress) ? (parsed.progress as unknown as Progress) : fallback.progress;
  const stats = sanitizeStats(parsed.stats);
  const settings = sanitizeSettings(parsed.settings);
  const history = Array.isArray(parsed.history) ? (parsed.history as SessionSummary[]) : [];

  return { version: PROFILE_VERSION, progress, stats, settings, history };
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
