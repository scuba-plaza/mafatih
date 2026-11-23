import { useId } from "react";
import { Dialog } from "./Dialog.tsx";
import { BUTTON, DANGER_BUTTON, PRIMARY_BUTTON } from "./styles.ts";

const BODY = "flex flex-col gap-3 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]";

export interface ConfirmDialogProps {
  readonly open: boolean;
  readonly question: string;
  readonly warning: string;
  readonly keepLabel: string;
  readonly confirmLabel: string;
  readonly danger?: boolean;
  readonly onAnswer: (confirmed: boolean) => void;
}

export function ConfirmDialog({
  open,
  question,
  warning,
  keepLabel,
  confirmLabel,
  danger = false,
  onAnswer,
}: ConfirmDialogProps) {
  const warningId = useId();
  return (
    <Dialog
      plain
      open={open}
      title={question}
      describedBy={warningId}
      onClose={() => {
        if (open) {
          onAnswer(false);
        }
      }}
      className="md:w-md"
      bodyClassName={BODY}
    >
      <p id={warningId} className="text-muted">
        {warning}
      </p>
      <div className="mt-3 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => onAnswer(false)} className={BUTTON}>
          {keepLabel}
        </button>
        <button type="button" onClick={() => onAnswer(true)} className={danger ? DANGER_BUTTON : PRIMARY_BUTTON}>
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
