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
    <div className="flex flex-col gap-3">
      <h2 ref={heading} tabIndex={-1} aria-describedby={figuresId} className="text-lg font-semibold">
        {title ?? t("result.title")}
      </h2>
      <dl id={figuresId} className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 text-sm">
        {details.map((detail) => (
          <div key={detail.label} className="contents">
            <dt className="text-muted">{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
        <dt className="text-muted">{t("result.speed")}</dt>
        <dd>{formatNumber(metrics.cpm)}</dd>
        <dt className="text-muted">{t("result.accuracy")}</dt>
        <dd>{formatPercent(metrics.accuracy)}</dd>
        <dt className="text-muted">{t("result.mistakes")}</dt>
        <dd>{formatNumber(metrics.errors)}</dd>
      </dl>
      {note !== undefined && <p className="text-sm text-muted">{note}</p>}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
