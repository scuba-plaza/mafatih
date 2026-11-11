import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo } from "react";
import type { MessageKey } from "./en.ts";
import { directionOf, formatNumber, formatPercent, type Language, type MessageParams, translate } from "./i18n.ts";

export interface I18n {
  language: Language;
  direction: "ltr" | "rtl";
  t: (key: MessageKey, params?: MessageParams) => string;
  formatNumber: (value: number) => string;
  formatPercent: (ratio: number) => string;
}

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      language,
      direction: directionOf(language),
      t: (key, params) => translate(language, key, params),
      formatNumber: (value) => formatNumber(language, value),
      formatPercent: (ratio) => formatPercent(language, ratio),
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
