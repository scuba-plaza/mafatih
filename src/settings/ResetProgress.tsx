import { useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { initialProgress } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";

export function ResetProgress() {
  const { t } = useI18n();
  const { update } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!confirming && restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [confirming]);

  const answer = (reset: boolean) => {
    restoreFocus.current = true;
    if (reset) {
      update((current) => ({
        ...current,
        ladder: initialProgress(),
        stats: { practice: {}, recitation: {}, custom: {} },
        history: [],
      }));
    }
    setDone(reset);
    setConfirming(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {confirming ? (
        <ConfirmChoice
          question={t("settings.resetQuestion")}
          warning={t("settings.resetWarning")}
          keepLabel={t("settings.keepProgress")}
          confirmLabel={t("settings.resetConfirm")}
          onAnswer={answer}
        />
      ) : (
        <button type="button" ref={opener} onClick={() => setConfirming(true)} className={BUTTON}>
          {t("settings.reset")}
        </button>
      )}
      <p role="status" className="min-h-5 text-sm text-muted">
        {done ? t("settings.resetDone") : ""}
      </p>
    </div>
  );
}
