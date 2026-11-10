import { ar } from "./ar.ts";
import { en, type MessageKey } from "./en.ts";

export type Language = "en" | "ar";

export type MessageParams = Readonly<Record<string, string | number>>;

const CATALOGS: Record<Language, Record<MessageKey, string>> = { en, ar };

const LOCALE_WITH_OWN_DIGITS: Record<Language, string> = { en: "en", ar: "ar-u-nu-arab" };

const WHOLE_NUMBERS: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.en, { maximumFractionDigits: 0 }),
  ar: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.ar, { maximumFractionDigits: 0 }),
};

const WHOLE_PERCENTAGES: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.en, { style: "percent", maximumFractionDigits: 0 }),
  ar: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.ar, { style: "percent", maximumFractionDigits: 0 }),
};

const PLACEHOLDER = /\{(\w+)\}/g;

const FIRST_STRONG_ISOLATE = "\u2068";
const POP_DIRECTIONAL_ISOLATE = "\u2069";

function finite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`cannot format ${value}`);
  }
  return value;
}

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
  return WHOLE_NUMBERS[language].format(Math.round(finite(value)) || 0);
}

export function formatPercent(language: Language, ratio: number): string {
  return WHOLE_PERCENTAGES[language].format(finite(ratio));
}

export function placeholdersOf(template: string): string[] {
  return [...template.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

export function fillMessage(language: Language, template: string, params: MessageParams = {}): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    const value = Object.hasOwn(params, name) ? params[name] : undefined;
    if (value === undefined) {
      throw new Error(`message "${template}" needs a value for {${name}}`);
    }
    return typeof value === "number"
      ? formatNumber(language, value)
      : `${FIRST_STRONG_ISOLATE}${value}${POP_DIRECTIONAL_ISOLATE}`;
  });
}

export function translate(language: Language, key: MessageKey, params?: MessageParams): string {
  return fillMessage(language, CATALOGS[language][key], params);
}
