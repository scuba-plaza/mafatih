import { prepareCustomText } from "~/custom/text.ts";
import { detectLanguage, isLanguage, type Language } from "~/i18n/i18n.ts";
import { isRecord } from "~/storage/guards.ts";
import type { Vocalization } from "~/text/vocalization.ts";
import { clampFontSize, DEFAULT_FONT, DEFAULT_FONT_SIZE, type FontId, isFontId } from "./fonts.ts";

export interface Settings {
  readonly language: Language;
  readonly font: FontId;
  readonly fontSize: number;
  readonly vocalization: Vocalization;
  readonly requireBackspace: boolean;
  readonly customText: string;
}

const VOCALIZATIONS: readonly Vocalization[] = ["auto", "letters", "harakat", "full"];

function isVocalization(value: unknown): value is Vocalization {
  return VOCALIZATIONS.some((level) => level === value);
}

export function defaultSettings(preferredLanguages: readonly string[]): Settings {
  return {
    language: detectLanguage(preferredLanguages),
    font: DEFAULT_FONT,
    fontSize: DEFAULT_FONT_SIZE,
    vocalization: "auto",
    requireBackspace: true,
    customText: "",
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
    customText: typeof raw.customText === "string" ? prepareCustomText(raw.customText).text : defaults.customText,
  };
}
