import { useI18n } from "~/i18n/I18nProvider.tsx";
import { isComplete, metricsOf, type Session } from "./session.ts";

export function LiveStats({ session }: { session: Session }) {
  const { t, formatPercent, formatDuration } = useI18n();
  const shown = session.startedAt !== null && !isComplete(session);
  const metrics = metricsOf(session);

  return (
    <div className="hidden min-h-5 justify-center md:flex">
      {shown && (
        <p
          aria-hidden="true"
          data-live-stats=""
          className="flex gap-6 font-mono text-xs tracking-wide text-muted tabular-nums"
        >
          <span>{t("live.speed", { value: metrics.cpm })}</span>
          <span>{formatPercent(metrics.accuracy)}</span>
          <span>{t("live.errors", { value: metrics.errors })}</span>
          <span>{formatDuration(metrics.elapsedMs)}</span>
        </p>
      )}
    </div>
  );
}
