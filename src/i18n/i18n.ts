import { ar } from "./ar.ts";
import { en, type MessageKey } from "./en.ts";

export type Language = "en" | "ar";

export type MessageParams = Readonly<Record<string, string | number>>;

const CATALOGS: Record<Language, Record<MessageKey, string>> = { en, ar };

const LOCALES: Record<Language, string> = { en: "en", ar: "ar-u-nu-arab" };

const PLACEHOLDER = /\{(\w+)\}/g;

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ar";
}

export function detectLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split("-")[0];
    if (isLanguage(primary)) {
      return primary;
    }
  }
  return "en";
}

export function directionOf(language: Language): "ltr" | "rtl" {
  return language === "ar" ? "rtl" : "ltr";
}

export function formatNumber(language: Language, value: number): string {
  return new Intl.NumberFormat(LOCALES[language], { maximumFractionDigits: 0 }).format(value);
}

export function formatPercent(language: Language, ratio: number): string {
  return new Intl.NumberFormat(LOCALES[language], { style: "percent", maximumFractionDigits: 0 }).format(ratio);
}

export function fillMessage(language: Language, template: string, params: MessageParams = {}): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    const value = params[name];
    if (value === undefined) {
      throw new Error(`message "${template}" needs a value for {${name}}`);
    }
    return typeof value === "number" ? formatNumber(language, value) : value;
  });
}

export function translate(language: Language, key: MessageKey, params?: MessageParams): string {
  return fillMessage(language, CATALOGS[language][key], params);
}
