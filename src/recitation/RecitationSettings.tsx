import { useI18n } from "~/i18n/I18nProvider.tsx";
import { AYAT_PER_PASSAGE, type Settings } from "~/settings/settings.ts";
import { Segmented } from "~/ui/Segmented.tsx";
import { SECTION_TITLE } from "~/ui/styles.ts";
import type { SurahOrder } from "./order.ts";

export interface RecitationSettingsProps {
  readonly settings: Settings;
  readonly change: (patch: Partial<Settings>) => void;
}

export function RecitationSettings({ settings, change }: RecitationSettingsProps) {
  const { t, formatNumber } = useI18n();
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className={`mb-3 ${SECTION_TITLE}`}>{t("settings.recitation")}</legend>
      <Segmented
        legend={t("settings.ayatPerPassage")}
        value={String(settings.ayatPerLesson)}
        options={AYAT_PER_PASSAGE.map((count) => ({ value: String(count), label: formatNumber(count) }))}
        onChange={(count) => change({ ayatPerLesson: Number(count) })}
      />
      <Segmented<SurahOrder>
        legend={t("settings.surahOrder")}
        value={settings.surahOrder}
        options={[
          { value: "mushaf", label: t("order.mushaf"), hint: t("order.mushafHint") },
          { value: "juz-amma", label: t("order.juzAmma"), hint: t("order.juzAmmaHint") },
        ]}
        onChange={(surahOrder) => change({ surahOrder })}
      />
    </fieldset>
  );
}
