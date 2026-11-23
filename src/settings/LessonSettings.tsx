import { type ReactNode, useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { HINT_DELAY_MS } from "~/keyboard/hint.ts";
import { useLayoutName } from "~/keyboard/useLayoutName.ts";
import type { Vocalization } from "~/text/vocalization.ts";
import { Segmented } from "~/ui/Segmented.tsx";
import { Switch } from "~/ui/Switch.tsx";
import { SECTION_TITLE } from "~/ui/styles.ts";
import { FontPicker } from "./FontPicker.tsx";
import { clampFontSize, FONT_SIZES } from "./fonts.ts";
import type { Settings } from "./settings.ts";

const LAST_SIZE = FONT_SIZES.length - 1;

function Section({ title, children }: { readonly title: string; readonly children: ReactNode }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h3 id={titleId} className={SECTION_TITLE}>
        {title}
      </h3>
      {children}
    </section>
  );
}

export interface LessonSettingsProps {
  readonly settings: Settings;
  readonly change: (patch: Partial<Settings>) => void;
}

export function LessonControls({ settings, change }: LessonSettingsProps) {
  const { t, formatNumber } = useI18n();
  const sizeId = useId();
  const sizeIndex = FONT_SIZES.indexOf(settings.fontSize);
  return (
    <>
      <Section title={t("settings.text")}>
        <FontPicker legend={t("settings.font")} value={settings.font} onChange={(font) => change({ font })} />
        <div className="flex flex-col gap-1">
          <label htmlFor={sizeId} className="font-medium">
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
      </Section>
      <Section title={t("settings.typing")}>
        <Segmented<Vocalization>
          legend={t("settings.vocalization")}
          value={settings.vocalization}
          options={[
            { value: "auto", label: t("vocalization.auto") },
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
      </Section>
    </>
  );
}

export function KeyboardGuideSettings({ settings, change }: LessonSettingsProps) {
  const { t } = useI18n();
  const layoutName = useLayoutName();
  return (
    <fieldset className="hidden flex-col md:pointer-fine:flex">
      <legend className={`mb-2 ${SECTION_TITLE}`}>{t("settings.guide")}</legend>
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
      <Switch
        label={t("settings.keyLabels")}
        checked={settings.keyLabels}
        onChange={(keyLabels) => change({ keyLabels })}
      />
      <Switch
        label={t("settings.delayedHint")}
        hint={t("settings.delayedHintHint", { seconds: HINT_DELAY_MS / 1000 })}
        checked={settings.delayedHint}
        onChange={(delayedHint) => change({ delayedHint })}
      />
      <p className="text-sm text-muted">{t("settings.layoutHint", { layout: layoutName })}</p>
    </fieldset>
  );
}
