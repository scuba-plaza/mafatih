import { useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { LETTERS_END, unlockAllLetters } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { useConfirmation } from "~/ui/useConfirmation.ts";

export function UnlockLetters() {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const { confirming, opener, ask, settle } = useConfirmation();
  const [done, setDone] = useState(false);
  const allUnlocked = profile.ladder.unlocked >= LETTERS_END;

  const answer = (unlock: boolean) => {
    if (unlock) {
      update((current) => ({ ...current, ladder: unlockAllLetters(current.ladder) }));
    }
    setDone(unlock);
    settle();
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {confirming ? (
        <ConfirmChoice
          question={t("settings.unlockQuestion")}
          warning={t("settings.unlockWarning")}
          keepLabel={t("settings.unlockKeep")}
          confirmLabel={t("settings.unlockConfirm")}
          danger={false}
          onAnswer={answer}
        />
      ) : (
        <button
          type="button"
          ref={opener}
          aria-disabled={allUnlocked}
          onClick={() => {
            if (!allUnlocked) {
              ask();
            }
          }}
          className={`${BUTTON} aria-disabled:cursor-default aria-disabled:opacity-50`}
        >
          {t("settings.unlockLetters")}
        </button>
      )}
      <p role="status" className="min-h-5 text-sm text-muted">
        {done ? t("settings.unlockDone") : ""}
      </p>
    </div>
  );
}
