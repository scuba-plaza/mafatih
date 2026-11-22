import { useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { initialProgress } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { useConfirmation } from "~/ui/useConfirmation.ts";

export function ResetProgress() {
  const { t } = useI18n();
  const { update } = useProfile();
  const { confirming, opener, ask, settle } = useConfirmation();
  const [done, setDone] = useState(false);

  const answer = (reset: boolean) => {
    if (reset) {
      update((current) => ({
        ...current,
        ladder: initialProgress(),
        stats: { practice: {}, recitation: {}, custom: {} },
        history: [],
      }));
    }
    setDone(reset);
    settle();
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
        <button type="button" ref={opener} onClick={ask} className={BUTTON}>
          {t("settings.reset")}
        </button>
      )}
      <p role="status" className="min-h-5 text-sm text-muted">
        {done ? t("settings.resetDone") : ""}
      </p>
    </div>
  );
}
