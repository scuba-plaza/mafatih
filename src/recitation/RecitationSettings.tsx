import { useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { AYAT_PER_PASSAGE, type Settings } from "~/settings/settings.ts";
import { RadioGroup } from "~/ui/RadioGroup.tsx";
import type { SurahOrder } from "./order.ts";

export interface RecitationSettingsProps {
  readonly settings: Settings;
  readonly change: (patch: Partial<Settings>) => void;
}

export function RecitationSettings({ settings, change }: RecitationSettingsProps) {
  const { t, formatNumber } = useI18n();
  const selectId = useId();
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">{t("settings.recitation")}</legend>
      <div className="flex flex-col gap-1">
        <label htmlFor={selectId} className="font-medium">
          {t("settings.ayatPerPassage")}
        </label>
        <select
          id={selectId}
          value={settings.ayatPerLesson}
          onChange={(event) => change({ ayatPerLesson: Number(event.target.value) })}
          className="h-11 w-24 rounded-md border border-edge bg-surface px-3"
        >
          {AYAT_PER_PASSAGE.map((count) => (
            <option key={count} value={count}>
              {formatNumber(count)}
            </option>
          ))}
        </select>
      </div>
      <RadioGroup<SurahOrder>
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
