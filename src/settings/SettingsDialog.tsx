import { useEffect, useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Language } from "~/i18n/i18n.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { Dialog } from "~/ui/Dialog.tsx";
import { RadioGroup } from "~/ui/RadioGroup.tsx";
import { Switch } from "~/ui/Switch.tsx";
import { clampFontSize, FONT_SIZES, FONTS, type FontId, loadFont } from "./fonts.ts";
import { ResetProgress } from "./ResetProgress.tsx";
import type { Settings } from "./settings.ts";

const LANGUAGES = [
  { value: "en", label: "English", lang: "en" },
  { value: "ar", label: "العربية", lang: "ar" },
] as const;

const FONT_SAMPLE = "الخَطُّ العَرَبِيُّ";
const LAST_SIZE = FONT_SIZES.length - 1;

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t, formatNumber } = useI18n();
  const { profile, update } = useProfile();
  const { settings } = profile;
  const sizeId = useId();

  useEffect(() => {
    if (open) {
      for (const font of FONTS) {
        loadFont(font);
      }
    }
  }, [open]);

  const change = (patch: Partial<Settings>) =>
    update((current) => ({ ...current, settings: { ...current.settings, ...patch } }));

  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);

  return (
    <Dialog open={open} title={t("settings.title")} closeLabel={t("settings.done")} onClose={onClose}>
      <RadioGroup<Language>
        legend={t("settings.language")}
        value={settings.language}
        options={LANGUAGES}
        onChange={(language) => change({ language })}
      />
      <RadioGroup
        legend={t("settings.vocalization")}
        value={settings.vocalization}
        options={[
          { value: "auto", label: t("vocalization.auto"), hint: t("vocalization.autoHint") },
          { value: "letters", label: t("vocalization.letters"), hint: t("vocalization.lettersHint") },
          { value: "harakat", label: t("vocalization.harakat"), hint: t("vocalization.harakatHint") },
          { value: "full", label: t("vocalization.full"), hint: t("vocalization.fullHint") },
        ]}
        onChange={(vocalization) => change({ vocalization })}
      />
      <Switch
        label={t("settings.backspace")}
        hint={t("settings.backspaceHint")}
        checked={settings.requireBackspace}
        onChange={(requireBackspace) => change({ requireBackspace })}
      />
      <RadioGroup<FontId>
        legend={t("settings.font")}
        value={settings.font}
        options={FONTS.map((font) => ({
          value: font.id,
          label: font.family,
          preview: (
            <span
              aria-hidden="true"
              data-font-sample=""
              lang="ar"
              dir="rtl"
              className="text-2xl leading-loose"
              style={{ fontFamily: `"${font.family}", serif` }}
            >
              {FONT_SAMPLE}
            </span>
          ),
        }))}
        onChange={(font) => change({ font })}
      />
      <div className="flex flex-col gap-1">
        <label htmlFor={sizeId} className="font-semibold">
          {t("settings.fontSize")}
        </label>
        <div className="flex min-h-11 items-center gap-3">
          <input
            id={sizeId}
            type="range"
            min={0}
            max={LAST_SIZE}
            step={1}
            value={sizeIndex}
            aria-valuetext={formatNumber(settings.fontSize)}
            onChange={(event) => change({ fontSize: clampFontSize(FONT_SIZES[Number(event.target.value)]) })}
            className="h-11 min-w-0 flex-1 accent-accent"
          />
          <span aria-hidden="true" className="w-8 text-end tabular-nums">
            {formatNumber(settings.fontSize)}
          </span>
        </div>
      </div>
      <fieldset className="hidden flex-col md:pointer-fine:flex">
        <legend className="mb-1 font-semibold">{t("settings.guide")}</legend>
        <Switch
          label={t("settings.showKeyboard")}
          checked={settings.showKeyboard}
          onChange={(showKeyboard) => change({ showKeyboard })}
        />
        <Switch
          label={t("settings.fingerGuide")}
          checked={settings.fingerGuide}
          onChange={(fingerGuide) => change({ fingerGuide })}
        />
      </fieldset>
      <ResetProgress />
    </Dialog>
  );
}
