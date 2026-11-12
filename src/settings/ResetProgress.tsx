import { useEffect, useId, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { initialProgress } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { BUTTON } from "~/ui/styles.ts";

const DANGER_BUTTON = "min-h-11 rounded-md bg-danger px-4 text-sm font-medium text-on-accent";

export function ResetProgress() {
  const { t } = useI18n();
  const { update } = useProfile();
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);
  const warningId = useId();

  useEffect(() => {
    if (confirming) {
      keep.current?.focus();
    } else if (restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [confirming]);

  const ask = () => {
    setDone(false);
    setConfirming(true);
  };

  const answer = (reset: boolean) => {
    restoreFocus.current = true;
    if (reset) {
      update((current) => ({
        ...current,
        ladder: initialProgress(),
        stats: { practice: {}, recitation: {}, custom: {} },
      }));
      setDone(true);
    }
    setConfirming(false);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      {confirming ? (
        <fieldset aria-describedby={warningId} className="flex flex-col items-start gap-3">
          <legend className="mb-1 font-semibold">{t("settings.resetQuestion")}</legend>
          <p id={warningId} className="text-sm text-muted">
            {t("settings.resetWarning")}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" ref={keep} onClick={() => answer(false)} className={BUTTON}>
              {t("settings.resetKeep")}
            </button>
            <button type="button" onClick={() => answer(true)} className={DANGER_BUTTON}>
              {t("settings.resetConfirm")}
            </button>
          </div>
        </fieldset>
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
