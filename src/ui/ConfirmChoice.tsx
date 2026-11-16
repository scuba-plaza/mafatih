import { useEffect, useId, useRef } from "react";
import { BUTTON, DANGER_BUTTON } from "./styles.ts";

export interface ConfirmChoiceProps {
  readonly question: string;
  readonly warning: string;
  readonly keepLabel: string;
  readonly confirmLabel: string;
  readonly danger?: boolean;
  readonly onAnswer: (confirmed: boolean) => void;
}

export function ConfirmChoice({
  question,
  warning,
  keepLabel,
  confirmLabel,
  danger = true,
  onAnswer,
}: ConfirmChoiceProps) {
  const keep = useRef<HTMLButtonElement>(null);
  const warningId = useId();

  useEffect(() => {
    keep.current?.focus();
  }, []);

  return (
    <fieldset aria-describedby={warningId} className="flex flex-col items-start gap-3">
      <legend className="mb-1 font-medium">{question}</legend>
      <p id={warningId} className="text-sm text-muted">
        {warning}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" ref={keep} onClick={() => onAnswer(false)} className={BUTTON}>
          {keepLabel}
        </button>
        <button type="button" onClick={() => onAnswer(true)} className={danger ? DANGER_BUTTON : BUTTON}>
          {confirmLabel}
        </button>
      </div>
    </fieldset>
  );
}
