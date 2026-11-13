import { useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { TOUCH_TARGET } from "~/ui/styles.ts";
import { SettingsDialog } from "./SettingsDialog.tsx";

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 md:hidden"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </svg>
  );
}

export function SettingsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${TOUCH_TARGET} px-3 text-sm text-muted md:px-3`}>
        <GearIcon />
        <span className="sr-only md:not-sr-only">{t("settings.title")}</span>
      </button>
      <SettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
