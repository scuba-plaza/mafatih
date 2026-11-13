import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo } from "react";
import type { MessageKey } from "./en.ts";
import {
  directionOf,
  formatBytes,
  formatDate,
  formatDuration,
  formatNumber,
  formatPercent,
  type Language,
  type MessageParams,
  type PluralMessage,
  translate,
  translatePlural,
} from "./i18n.ts";

export interface I18n {
  language: Language;
  direction: "ltr" | "rtl";
  t: (key: MessageKey, params?: MessageParams) => string;
  plural: (key: PluralMessage, count: number, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  formatPercent: (ratio: number) => string;
  formatDuration: (ms: number) => string;
  formatBytes: (bytes: number) => string;
  formatDate: (ms: number, timeZone?: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      language,
      direction: directionOf(language),
      t: (key, params) => translate(language, key, params),
      plural: (key, count, params) => translatePlural(language, key, count, params),
      formatNumber: (value) => formatNumber(language, value),
      formatPercent: (ratio) => formatPercent(language, ratio),
      formatDuration: (ms) => formatDuration(language, ms),
      formatBytes: (bytes) => formatBytes(language, bytes),
      formatDate: (ms, timeZone) => formatDate(language, ms, timeZone),
    }),
    [language],
  );

  useLayoutEffect(() => {
    document.documentElement.lang = value.language;
    document.documentElement.dir = value.direction;
  }, [value]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (value === null) {
    throw new Error("useI18n needs an I18nProvider above it");
  }
  return value;
}
