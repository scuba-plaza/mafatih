import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { type KeyStats, statOf } from "~/stats/keystats.ts";
import { carriedMark } from "~/text/arabic.ts";
import { requiredMarks, type Vocalization } from "~/text/vocalization.ts";
import type { Metrics } from "~/typing/session.ts";
import { focusRung, LADDER, type LadderProgress, type Rung, unlockedMarks } from "./ladder.ts";

export interface LastLesson {
  readonly metrics: Metrics;
  readonly unlocked: Rung | undefined;
}

export interface HudProps {
  readonly progress: LadderProgress;
  readonly stats: KeyStats;
  readonly vocalization: Vocalization;
  readonly last: LastLesson | null;
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function isTyped(rung: Rung, progress: LadderProgress, vocalization: Vocalization): boolean {
  return rung.kind === "letter" || requiredMarks(vocalization, unlockedMarks(progress)).has(rung.char);
}

export function Hud({ progress, stats, vocalization, last }: HudProps) {
  const { t, formatPercent } = useI18n();
  const total = LADDER.rungs.length;
  const rung = focusRung(progress);
  const finished = progress.unlocked >= total;
  const drilled = rung !== undefined && !finished && isTyped(rung, progress, vocalization);
  const stat = rung === undefined ? undefined : statOf(stats, rung.char);
  const typed = stat !== undefined && stat.attempts > 0;
  const announcement =
    last?.unlocked === undefined ? "" : t("hud.unlockedKey", { key: carriedMark(last.unlocked.char) });

  return (
    <section aria-label={t("hud.label")} className="flex flex-col gap-1 rounded-md border border-line bg-surface p-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Item label={t("hud.keys")}>{t("hud.keysValue", { count: progress.unlocked, total })}</Item>
        {drilled && (
          <>
            <Item label={t("hud.newest")}>
              <span lang="ar">{carriedMark(rung.char)}</span>
            </Item>
            <Item label={t("result.accuracy")}>{typed ? formatPercent(stat.recentAccuracy) : t("hud.none")}</Item>
            <Item label={t("hud.time")}>
              {typed && stat.timed > 0 ? t("hud.timeValue", { ms: stat.meanMs }) : t("hud.none")}
            </Item>
          </>
        )}
        <Item label={t("hud.last")}>
          {last === null
            ? t("hud.none")
            : t("hud.lastValue", {
                speed: last.metrics.cpm,
                accuracy: Math.round(last.metrics.accuracy * 100),
              })}
        </Item>
      </dl>
      {finished && <p className="text-sm text-muted">{t("hud.allUnlocked")}</p>}
      {!finished && !drilled && <p className="text-sm text-muted">{t("hud.marksNotTyped")}</p>}
      <p role="status" className="min-h-5 text-sm font-medium">
        {announcement}
      </p>
    </section>
  );
}
