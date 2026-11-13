import { prepareCustomText } from "~/custom/text.ts";
import { detectLanguage, isLanguage, type Language } from "~/i18n/i18n.ts";
import { isRecord } from "~/lib/guards.ts";
import { DEFAULT_RECITER, isReciterId, type ReciterId } from "~/recitation/audio/reciters.ts";
import { SURAH_ORDERS, type SurahOrder } from "~/recitation/order.ts";
import type { Vocalization } from "~/text/vocalization.ts";
import { clampFontSize, DEFAULT_FONT, DEFAULT_FONT_SIZE, type FontId, isFontId } from "./fonts.ts";

export interface Settings {
  readonly language: Language;
  readonly font: FontId;
  readonly fontSize: number;
  readonly vocalization: Vocalization;
  readonly requireBackspace: boolean;
  readonly showKeyboard: boolean;
  readonly fingerGuide: boolean;
  readonly customText: string;
  readonly ayatPerLesson: number;
  readonly surahOrder: SurahOrder;
  readonly reciter: ReciterId;
  readonly volume: number;
  readonly muted: boolean;
  readonly playWhole: boolean;
  readonly loop: boolean;
}

export const AYAT_PER_PASSAGE: readonly number[] = [1, 2, 3, 4];

const DEFAULT_AYAT_PER_LESSON = 4;
const DEFAULT_VOLUME = 0.8;

const VOCALIZATIONS: readonly Vocalization[] = ["auto", "letters", "harakat", "full"];

function isVocalization(value: unknown): value is Vocalization {
  return VOCALIZATIONS.some((level) => level === value);
}

function isSurahOrder(value: unknown): value is SurahOrder {
  return SURAH_ORDERS.some((order) => order === value);
}

function clampAyatPerLesson(value: unknown): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return DEFAULT_AYAT_PER_LESSON;
  }
  return Math.min(Math.max(Math.round(value), 1), AYAT_PER_PASSAGE.length);
}

function clampVolume(value: unknown): number {
  return typeof value === "number" && !Number.isNaN(value) ? Math.min(Math.max(value, 0), 1) : DEFAULT_VOLUME;
}

export function defaultSettings(preferredLanguages: readonly string[]): Settings {
  return {
    language: detectLanguage(preferredLanguages),
    font: DEFAULT_FONT,
    fontSize: DEFAULT_FONT_SIZE,
    vocalization: "auto",
    requireBackspace: true,
    showKeyboard: true,
    fingerGuide: true,
    customText: "",
    ayatPerLesson: DEFAULT_AYAT_PER_LESSON,
    surahOrder: "mushaf",
    reciter: DEFAULT_RECITER,
    volume: DEFAULT_VOLUME,
    muted: false,
    playWhole: false,
    loop: false,
  };
}

export function sanitizeSettings(raw: unknown, preferredLanguages: readonly string[]): Settings {
  const defaults = defaultSettings(preferredLanguages);
  if (!isRecord(raw)) {
    return defaults;
  }
  return {
    language: isLanguage(raw.language) ? raw.language : defaults.language,
    font: isFontId(raw.font) ? raw.font : defaults.font,
    fontSize: clampFontSize(raw.fontSize),
    vocalization: isVocalization(raw.vocalization) ? raw.vocalization : defaults.vocalization,
    requireBackspace: raw.requireBackspace !== false,
    showKeyboard: raw.showKeyboard !== false,
    fingerGuide: raw.fingerGuide !== false,
    customText: typeof raw.customText === "string" ? prepareCustomText(raw.customText).text : defaults.customText,
    ayatPerLesson: clampAyatPerLesson(raw.ayatPerLesson),
    surahOrder: isSurahOrder(raw.surahOrder) ? raw.surahOrder : defaults.surahOrder,
    reciter: isReciterId(raw.reciter) ? raw.reciter : defaults.reciter,
    volume: clampVolume(raw.volume),
    muted: raw.muted === true,
    playWhole: raw.playWhole === true,
    loop: raw.loop === true,
  };
}
