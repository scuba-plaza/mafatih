import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { FONTS } from "./fonts.ts";
import { LANGUAGES } from "./GeneralSettings.tsx";
import type { GroupId } from "./groups.ts";
import type { Settings } from "./settings.ts";

export function useGroupSummaries(settings: Settings): Readonly<Record<GroupId, ReactNode>> {
  const { t, formatNumber } = useI18n();
  const font = FONTS.find((candidate) => candidate.id === settings.font) ?? FONTS[0];
  return {
    general: LANGUAGES.find((language) => language.value === settings.language)?.label,
    lesson: (
      <>
        <bdi>{font.family}</bdi> · {formatNumber(settings.fontSize)}
      </>
    ),
    recitation: t("settings.summary.recitation", {
      reciter: t(settings.reciter === "murattal" ? "reciter.murattal" : "reciter.mujawwad"),
      count: formatNumber(settings.ayatPerLesson),
    }),
  };
}
