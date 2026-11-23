import { useId, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { SIDE_PADDING } from "~/ui/Dialog.tsx";
import { SECTION_TITLE } from "~/ui/styles.ts";
import { LessonPreview } from "./LessonPreview.tsx";
import type { LessonDisplaySettings } from "./settings.ts";

export function PreviewPeek({ settings }: { readonly settings: LessonDisplaySettings }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const bodyId = useId();
  return (
    <div className="shrink-0 border-b border-line">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen(!open)}
        className={`flex min-h-11 w-full items-center justify-between ${SECTION_TITLE} ${SIDE_PADDING}`}
      >
        <span>{t("settings.preview")}</span>
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 border-e-2 border-b-2 border-edge ${open ? "rotate-[225deg]" : "rotate-45"}`}
        />
      </button>
      <div id={bodyId}>
        <LessonPreview settings={settings} lines={open ? 3 : 1} />
      </div>
    </div>
  );
}
