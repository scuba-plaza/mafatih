import { type ReactNode, useEffect, useRef } from "react";
import { PRIMARY_BUTTON } from "~/components/ui.ts";
import { useLatest } from "~/hooks/useLatest.ts";

export const FIELD =
  "rounded-md bg-stone-100 px-2 py-1 text-sm text-stone-800 outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:bg-stone-800 dark:text-stone-100";
export const ROW = "flex items-center justify-between gap-6 py-2.5";
export const NAME = "text-sm text-stone-500 dark:text-stone-400";
export const NOTE = "py-2.5 text-xs text-stone-400";

export function SelectRow({
  label,
  cy,
  value,
  onChange,
  children,
}: {
  label: string;
  cy: string;
  value: string | number;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className={ROW}>
      <span className={NAME}>{label}</span>
      <select data-cy={cy} className={FIELD} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </label>
  );
}

export function CheckboxRow({
  label,
  cy,
  checked,
  onChange,
}: {
  label: string;
  cy: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className={ROW}>
      <span className={NAME}>{label}</span>
      <input
        type="checkbox"
        data-cy={cy}
        className="h-4 w-4 accent-sky-600"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

export function DoneButton({ cy, onClick }: { cy: string; onClick: () => void }) {
  return (
    <button type="button" data-cy={cy} onClick={onClick} className={`${PRIMARY_BUTTON} py-1.5`}>
      Done
    </button>
  );
}

export interface ModalProps {
  open: boolean;
  cy: string;
  title: string;
  onClose: () => void;
  onBack?: () => void;
  children: ReactNode;
  footer: ReactNode;
}

export default function Modal({ open, cy, title, onClose, onBack, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useLatest(open);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-cy={`${cy}-dialog`}
      aria-label={title}
      onClose={() => {
        if (openRef.current) {
          onClose();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          onClose();
        }
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-2xl ring-1 ring-stone-200 backdrop:bg-stone-950/40 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-800"
    >
      <div data-cy={cy} className="px-6 py-5">
        <header className="flex items-baseline justify-between pb-2">
          <h2 className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
            {onBack === undefined ? null : (
              <button
                type="button"
                data-cy={`${cy}-back`}
                onClick={onBack}
                aria-label="Back to settings"
                className="text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
                  <path d="M10.8 5.4 4.2 12l6.6 6.6 1.4-1.4L7.9 13H20v-2H7.9l4.3-4.2z" />
                </svg>
              </button>
            )}
            {title}
          </h2>
          <button
            type="button"
            data-cy={`close-${cy}`}
            onClick={onClose}
            aria-label={`Close ${title.toLowerCase()}`}
            className="text-lg leading-none text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          >
            ×
          </button>
        </header>

        <div className="divide-y divide-stone-200/70 dark:divide-stone-800/80">{children}</div>

        <footer className="flex items-center justify-between pt-4">{footer}</footer>
      </div>
    </dialog>
  );
}
