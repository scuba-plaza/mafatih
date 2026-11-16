import { useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { LETTERS_END, unlockAllLetters } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";

export function UnlockLetters() {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const allUnlocked = profile.ladder.unlocked >= LETTERS_END;

  useEffect(() => {
    if (!confirming && restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [confirming]);

  const answer = (unlock: boolean) => {
    restoreFocus.current = true;
    if (unlock) {
      update((current) => ({ ...current, ladder: unlockAllLetters(current.ladder) }));
    }
    setDone(unlock);
    setConfirming(false);
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
              setConfirming(true);
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
