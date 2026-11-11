import { detectLanguage, isLanguage, type Language } from "~/i18n/i18n.ts";
import { isRecord } from "~/storage/guards.ts";

export interface Settings {
  readonly language: Language;
}

export function defaultSettings(preferredLanguages: readonly string[]): Settings {
  return { language: detectLanguage(preferredLanguages) };
}

export function sanitizeSettings(raw: unknown, preferredLanguages: readonly string[]): Settings {
  const defaults = defaultSettings(preferredLanguages);
  if (!isRecord(raw)) {
    return defaults;
  }
  return { language: isLanguage(raw.language) ? raw.language : defaults.language };
}
