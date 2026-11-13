import { type ReactNode, useEffect, useId, useRef } from "react";
import { announceDialogChange } from "./dialogs.ts";
import { BUTTON, SHEET } from "./styles.ts";

const SIDE_PADDING = "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function Dialog({ open, title, closeLabel, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      element.scrollTop = 0;
      announceDialogChange();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      closedby="any"
      onClose={() => {
        announceDialogChange();
        onClose();
      }}
      className={`${SHEET} md:w-lg`}
    >
      {open && (
        <>
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 rounded-full bg-edge md:hidden" />
          <div
            className={`sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-line bg-surface py-2 ${SIDE_PADDING}`}
          >
            <h2 id={titleId} className="min-w-0 text-lg font-medium break-words">
              {title}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className={`${BUTTON} shrink-0`}>
              {closeLabel}
            </button>
          </div>
          <div className={`flex flex-col gap-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${SIDE_PADDING}`}>
            {children}
          </div>
        </>
      )}
    </dialog>
  );
}
