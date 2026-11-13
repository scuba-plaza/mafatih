import { useEffect, useState } from "react";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "./ProfileProvider.tsx";
import type { StorageNotice as Notice } from "./profile.ts";

const MESSAGES: Record<Exclude<Notice, null>, MessageKey> = {
  unavailable: "notice.progressNotSaved",
  reset: "notice.startedFresh",
  newer: "notice.newerVersion",
};

function InfoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="mt-3 size-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" strokeLinecap="round" />
    </svg>
  );
}

export function StorageNotice() {
  const { notice } = useProfile();
  const { t } = useI18n();
  const [shown, setShown] = useState<Notice>(null);

  useEffect(() => {
    setShown(notice);
  }, [notice]);

  const dismiss = () => {
    setShown(null);
    document.querySelector("main")?.focus();
  };

  return (
    <div role="status">
      {shown !== null && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-line bg-surface ps-3 text-sm">
          <InfoIcon />
          <p className="flex-1 py-3">{t(MESSAGES[shown])}</p>
          <button type="button" onClick={dismiss} className="min-h-11 min-w-11 px-3 font-medium underline">
            {t("notice.dismiss")}
          </button>
        </div>
      )}
    </div>
  );
}
