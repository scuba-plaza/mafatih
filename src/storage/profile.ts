import { clampVolume, DEFAULT_RECITER, DEFAULT_VOLUME, isReciterId, type ReciterId } from "~/engine/audio/reciters.ts";
import { isTier, type Tier } from "~/engine/corpus/normalize.ts";
import { clampFontSize, DEFAULT_FONT, DEFAULT_FONT_SIZE, type FontId, isFontId } from "~/engine/fonts.ts";
import { DEFAULT_CUSTOM_TEXT, MAX_CUSTOM_CHARS } from "~/engine/lessons/custom.ts";
import { clampAyatPerLesson, DEFAULT_AYAT_PER_LESSON } from "~/engine/lessons/lesson.ts";
import { emptyStats, type KeyStats, sanitizeStats } from "~/engine/stats/keystats.ts";
import { initialProgress, type Progress } from "~/engine/stats/unlock.ts";
import {
  DEFAULT_SURAH_ORDER,
  emptyStory,
  isSurahOrder,
  type Story,
  type SurahOrder,
  sanitizeStory,
} from "~/engine/story/story.ts";

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
  version: number;
  progress: Progress;
  stats: KeyStats;
  settings: Settings;
  history: SessionSummary[];
  story: Story;
}

const PROFILE_VERSION = 1;
const MAX_HISTORY = 50;

export const STORAGE_KEY = "mafatih.profile.v1";

export function defaultSettings(): Settings {
  return {
    mode: "adaptive",
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
    version: PROFILE_VERSION,
    progress: initialProgress(),
    stats: emptyStats(),
    settings: defaultSettings(),
    history: [],
    story: emptyStory(),
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
  return {
    mode: isMode(raw.mode) ? raw.mode : fallback.mode,
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
  if (!isRecord(parsed) || parsed.version !== PROFILE_VERSION) {
    return defaultProfile();
  }

  const fallback = defaultProfile();
  const progress = isRecord(parsed.progress) ? (parsed.progress as unknown as Progress) : fallback.progress;
  const stats = sanitizeStats(parsed.stats);
  const settings = sanitizeSettings(parsed.settings);
  const history = Array.isArray(parsed.history) ? (parsed.history as SessionSummary[]) : [];
  const story = sanitizeStory(parsed.story, isRecord(parsed.settings) ? parsed.settings.surah : undefined);

  return { version: PROFILE_VERSION, progress, stats, settings, history, story };
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
