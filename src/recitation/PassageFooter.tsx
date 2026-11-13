import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { Rail } from "~/ui/Rail.tsx";
import type { SurahMeta } from "./quran.ts";

export interface PassageFooterProps {
  readonly meta: SurahMeta;
  readonly typed: number;
  readonly audio: ReactNode;
}

export function PassageFooter({ meta, typed, audio }: PassageFooterProps) {
  const { t } = useI18n();

  return (
    <fieldset className="mt-auto flex min-w-0 flex-col gap-3 pt-6">
      <legend className="sr-only">{t("bar.label")}</legend>
      <Rail value={typed / meta.ayat} />
      <div className="grid grid-cols-1 gap-y-1 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-x-4">
        <p className="sr-only text-xs text-muted md:not-sr-only">{t("map.typed", { typed, total: meta.ayat })}</p>
        <div className="justify-self-center">{audio}</div>
      </div>
    </fieldset>
  );
}
