import { useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { TOUCH_TARGET } from "~/ui/styles.ts";
import { SettingsDialog } from "./SettingsDialog.tsx";

function SlidersIcon() {
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
      <path d="M4 7h9M19 7h1M4 17h3M13 17h7" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="10" cy="17" r="2.5" />
    </svg>
  );
}

export function SettingsButton() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`${TOUCH_TARGET} px-3 text-sm text-muted`}>
        <SlidersIcon />
        <span className="sr-only md:not-sr-only">{t("settings.title")}</span>
      </button>
      <SettingsDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
