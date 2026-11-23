import { useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmDialog } from "~/ui/ConfirmDialog.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { LADDER, unlockAllKeys } from "./ladder.ts";

export interface UnlockAllKeysProps {
  readonly onUnlocked: () => void;
}

export function UnlockAllKeys({ onUnlocked }: UnlockAllKeysProps) {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const [asking, setAsking] = useState(false);
  const everyKey = profile.ladder.unlocked >= LADDER.rungs.length;

  const answer = (confirmed: boolean) => {
    setAsking(false);
    if (confirmed) {
      update((current) => ({ ...current, ladder: unlockAllKeys(current.ladder) }));
      onUnlocked();
    }
  };

  return (
    <>
      {!everyKey && (
        <button type="button" onClick={() => setAsking(true)} className={BUTTON}>
          {t("practice.unlock")}
        </button>
      )}
      <ConfirmDialog
        open={asking}
        question={t("practice.unlockQuestion")}
        warning={t("practice.unlockWarning")}
        keepLabel={t("practice.unlockKeep")}
        confirmLabel={t("practice.unlockConfirm")}
        onAnswer={answer}
      />
    </>
  );
}
