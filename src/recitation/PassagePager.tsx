import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { ICON_BUTTON } from "./audio/styles.ts";
import type { Position } from "./progress.ts";

export interface PassagePagerProps {
  readonly previous: Position;
  readonly next: Position;
  readonly onGo: (position: Position) => void;
  readonly children: ReactNode;
}

function Chevron({ toward }: { readonly toward: "start" | "end" }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="rtl:-scale-x-100"
    >
      <path d={toward === "start" ? "M14.5 6l-6 6 6 6" : "M9.5 6l6 6-6 6"} />
    </svg>
  );
}

export function PassagePager({ previous, next, onGo, children }: PassagePagerProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-1">
      <button type="button" aria-keyshortcuts="PageUp" onClick={() => onGo(previous)} className={ICON_BUTTON}>
        <Chevron toward="start" />
        <span className="sr-only">{t("pager.previous")}</span>
      </button>
      <div className="min-w-0 wrap-anywhere">{children}</div>
      <button type="button" aria-keyshortcuts="PageDown" onClick={() => onGo(next)} className={ICON_BUTTON}>
        <Chevron toward="end" />
        <span className="sr-only">{t("pager.next")}</span>
      </button>
    </div>
  );
}
