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

const TWO_DIGITS: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.en, { minimumIntegerDigits: 2, maximumFractionDigits: 0 }),
  ar: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.ar, { minimumIntegerDigits: 2, maximumFractionDigits: 0 }),
};

export function formatDuration(language: Language, ms: number): string {
  const seconds = Math.max(0, Math.round(finite(ms) / 1000));
  return `${formatNumber(language, Math.floor(seconds / 60))}:${TWO_DIGITS[language].format(seconds % 60)}`;
}

const KILOBYTES: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.en, { style: "unit", unit: "kilobyte", maximumFractionDigits: 0 }),
  ar: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.ar, { style: "unit", unit: "kilobyte", maximumFractionDigits: 0 }),
};

const MEGABYTES: Record<Language, Intl.NumberFormat> = {
  en: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.en, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }),
  ar: new Intl.NumberFormat(LOCALE_WITH_OWN_DIGITS.ar, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 }),
};

const BYTES_IN_KILOBYTE = 1000;
const BYTES_IN_MEGABYTE = 1_000_000;

export function formatBytes(language: Language, bytes: number): string {
  const size = Math.max(0, finite(bytes));
  return size < BYTES_IN_MEGABYTE
    ? KILOBYTES[language].format(Math.round(size / BYTES_IN_KILOBYTE))
    : MEGABYTES[language].format(size / BYTES_IN_MEGABYTE);
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
