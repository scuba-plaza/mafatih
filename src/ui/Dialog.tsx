import { type ReactNode, type RefObject, useEffect, useId, useRef } from "react";
import { announceDialogChange } from "./dialogs.ts";
import { BUTTON, SHEET } from "./styles.ts";

export const SIDE_PADDING = "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";

const BODY = `flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${SIDE_PADDING}`;

export interface DialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly label?: string;
  readonly describedBy?: string;
  readonly titleRef?: RefObject<HTMLHeadingElement | null>;
  readonly closeLabel?: string;
  readonly plain?: boolean;
  readonly onClose: () => void;
  readonly leading?: ReactNode;
  readonly className?: string;
  readonly bodyClassName?: string;
  readonly children: ReactNode;
}

export function Dialog({
  open,
  title,
  label,
  describedBy,
  titleRef,
  closeLabel,
  plain = false,
  onClose,
  leading,
  className = "md:w-lg",
  bodyClassName = BODY,
  children,
}: DialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }
    if (open && !element.open) {
      element.showModal();
      announceDialogChange();
    } else if (!open && element.open) {
      element.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      aria-label={label}
      aria-labelledby={label === undefined ? titleId : undefined}
      aria-describedby={describedBy}
      closedby="any"
      onClose={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        announceDialogChange();
        onClose();
      }}
      className={`${SHEET} overflow-hidden! open:flex open:flex-col ${className}`}
    >
      {open && (
        <>
          <span aria-hidden="true" className="mx-auto mt-2 block h-1 w-10 shrink-0 rounded-full bg-edge md:hidden" />
          {plain ? (
            <div className={bodyClassName}>
              <h2 ref={titleRef} id={titleId} className="text-xl font-semibold break-words outline-none">
                {title}
              </h2>
              {children}
            </div>
          ) : (
            <>
              <div
                className={`@container grid shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-3 border-b border-line bg-surface py-2 md:grid-cols-[minmax(0,1fr)_auto] ${SIDE_PADDING}`}
              >
                <div className="justify-self-start md:hidden">{leading}</div>
                <h2
                  ref={titleRef}
                  id={titleId}
                  className="min-w-0 text-center text-lg font-medium break-words outline-none md:text-start"
                >
                  {title}
                </h2>
                {closeLabel !== undefined && (
                  <button
                    type="button"
                    onClick={() => dialog.current?.close()}
                    className={`${BUTTON} shrink-0 justify-self-end`}
                  >
                    {closeLabel}
                  </button>
                )}
              </div>
              <div className={bodyClassName}>{children}</div>
            </>
          )}
        </>
      )}
    </dialog>
  );
}
