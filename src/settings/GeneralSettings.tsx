import { formatRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Language } from "~/i18n/i18n.ts";
import { BackupRestore } from "~/storage/BackupRestore.tsx";
import { RadioGroup } from "~/ui/RadioGroup.tsx";
import { ResetProgress } from "./ResetProgress.tsx";
import type { Settings } from "./settings.ts";

export const LANGUAGES = [
  { value: "en", label: "English", lang: "en" },
  { value: "ar", label: "العربية", lang: "ar" },
] as const;

export interface GeneralSettingsProps {
  readonly settings: Settings;
  readonly change: (patch: Partial<Settings>) => void;
  readonly onNavigate: () => void;
}

export function GeneralSettings({ settings, change, onNavigate }: GeneralSettingsProps) {
  const { t } = useI18n();
  return (
    <>
      <RadioGroup<Language>
        legend={t("settings.language")}
        value={settings.language}
        options={LANGUAGES}
        onChange={(language) => change({ language })}
      />
      <BackupRestore />
      <ResetProgress />
      <a
        href={formatRoute({ page: "about" })}
        onClick={onNavigate}
        className="flex min-h-11 items-center self-start text-sm text-muted underline underline-offset-4"
      >
        {t("nav.about")}
      </a>
    </>
  );
}
