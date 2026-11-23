import { useId } from "react";
import { Dialog } from "./Dialog.tsx";
import { BUTTON } from "./styles.ts";

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly question: string;
  readonly warning: string;
  readonly keepLabel: string;
  readonly confirmLabel: string;
  readonly onAnswer: (confirmed: boolean) => void;
}

export function ConfirmDialog({ open, question, warning, keepLabel, confirmLabel, onAnswer }: ConfirmDialogProps) {
  const warningId = useId();
  return (
    <Dialog
      open={open}
      title={question}
      describedBy={warningId}
      closeLabel={keepLabel}
      onClose={() => onAnswer(false)}
      className="md:w-md"
    >
      <p id={warningId} className="text-sm text-muted">
        {warning}
      </p>
      <button type="button" onClick={() => onAnswer(true)} className={`${BUTTON} self-start`}>
        {confirmLabel}
      </button>
    </Dialog>
  );
}
