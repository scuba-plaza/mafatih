import { useEffect, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Settings } from "~/settings/settings.ts";
import { RadioGroup } from "~/ui/RadioGroup.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { type AudioCacheUsage, sharedAudioCache } from "./cache.ts";
import type { ReciterId } from "./reciters.ts";

const NO_USAGE: AudioCacheUsage = { files: 0, bytes: 0 };

export interface AudioSettingsProps {
  readonly settings: Settings;
  readonly change: (patch: Partial<Settings>) => void;
}

export function AudioSettings({ settings, change }: AudioSettingsProps) {
  const { t, formatBytes } = useI18n();
  const [usage, setUsage] = useState(NO_USAGE);
  const [deleted, setDeleted] = useState(false);
  const cache = sharedAudioCache();

  useEffect(() => {
    let current = true;
    cache?.usage().then((found) => {
      if (current) {
        setUsage(found);
      }
    });
    return () => {
      current = false;
    };
  }, [cache]);

  const remove = async () => {
    await cache?.clear();
    setUsage(NO_USAGE);
    setDeleted(true);
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-semibold">{t("settings.audio")}</legend>
      <RadioGroup<ReciterId>
        legend={t("settings.reciter")}
        value={settings.reciter}
        options={[
          { value: "murattal", label: t("reciter.murattal"), hint: t("reciter.murattalHint") },
          { value: "mujawwad", label: t("reciter.mujawwad"), hint: t("reciter.mujawwadHint") },
        ]}
        onChange={(reciter) => change({ reciter })}
      />
      {cache !== null && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm">{t("audio.usage", { files: usage.files, size: formatBytes(usage.bytes) })}</p>
          <button type="button" onClick={remove} className={BUTTON}>
            {t("audio.delete")}
          </button>
          <p role="status" className="min-h-5 text-sm text-muted">
            {deleted ? t("audio.deleted") : ""}
          </p>
        </div>
      )}
    </fieldset>
  );
}
