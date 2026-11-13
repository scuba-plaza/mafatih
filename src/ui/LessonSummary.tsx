import { type ReactNode, useEffect, useId, useRef } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Metrics } from "~/typing/session.ts";

export interface SummaryDetail {
  readonly label: string;
  readonly value: string;
}

export interface LessonSummaryProps {
  readonly metrics: Metrics;
  readonly title?: string;
  readonly details?: readonly SummaryDetail[];
  readonly note?: string;
  readonly children: ReactNode;
}

export function LessonSummary({ metrics, title, details = [], note, children }: LessonSummaryProps) {
  const { t, formatNumber, formatPercent } = useI18n();
  const heading = useRef<HTMLHeadingElement>(null);
  const figuresId = useId();

  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h2 ref={heading} tabIndex={-1} aria-describedby={figuresId} className="text-xl font-normal tracking-tight">
        {title ?? t("result.title")}
      </h2>
      <dl id={figuresId} className="flex flex-wrap gap-x-8 gap-y-3">
        {[
          ...details,
          { label: t("result.speed"), value: formatNumber(metrics.cpm) },
          { label: t("result.accuracy"), value: formatPercent(metrics.accuracy) },
          { label: t("result.mistakes"), value: formatNumber(metrics.errors) },
        ].map((figure) => (
          <div key={figure.label} className="flex flex-col gap-1">
            <dt className="text-xs tracking-widest text-muted uppercase">{figure.label}</dt>
            <dd className="font-mono text-lg tabular-nums">{figure.value}</dd>
          </div>
        ))}
      </dl>
      {note !== undefined && <p className="text-sm text-muted">{note}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
