import { type ReactNode, useEffect, useId, useRef } from "react";
import { BUTTON } from "./styles.ts";

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly closeLabel: string;
  readonly onClose: () => void;
  readonly children: ReactNode;
}

export function Dialog({ open, title, closeLabel, onClose, children }: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<Element | null>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }
    if (open && !element.open) {
      opener.current = document.activeElement;
      element.showModal();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  const closed = () => {
    if (opener.current instanceof HTMLElement) {
      opener.current.focus();
    }
    opener.current = null;
    onClose();
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      closedby="any"
      onClose={closed}
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto overscroll-contain rounded-t-lg border border-line bg-surface p-0 text-ink backdrop:bg-black/50 md:inset-0 md:m-auto md:h-fit md:w-lg md:max-w-[calc(100%-2rem)] md:rounded-lg"
    >
      {open && (
        <>
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
            <h2 id={titleId} className="text-lg font-semibold">
              {title}
            </h2>
            <button type="button" onClick={() => dialog.current?.close()} className={BUTTON}>
              {closeLabel}
            </button>
          </div>
          <div className="flex flex-col gap-5 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
        </>
      )}
    </dialog>
  );
}
