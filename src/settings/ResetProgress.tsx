import { useId, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { initialProgress } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmDialog } from "~/ui/ConfirmDialog.tsx";
import { BUTTON, SECTION_TITLE } from "~/ui/styles.ts";

export function ResetProgress() {
  const { t } = useI18n();
  const { update } = useProfile();
  const [asking, setAsking] = useState(false);
  const titleId = useId();
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
    setAsking(false);
  };

  return (
    <section aria-labelledby={titleId} className="flex flex-col items-start gap-2">
      <h3 id={titleId} className={SECTION_TITLE}>
        {t("settings.reset")}
      </h3>
      <p className="text-sm text-muted">{t("settings.resetWarning")}</p>
      <button type="button" onClick={() => setAsking(true)} className={BUTTON}>
        {t("settings.reset")}
      </button>
      <ConfirmDialog
        danger
        open={asking}
        question={t("settings.resetQuestion")}
        warning={t("settings.resetWarning")}
        keepLabel={t("settings.keepProgress")}
        confirmLabel={t("settings.resetConfirm")}
        onAnswer={answer}
      />
      <p role="status" className="min-h-5 text-sm text-muted">
        {done ? t("settings.resetDone") : ""}
      </p>
    </section>
  );
}
