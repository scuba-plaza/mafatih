import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { type Language, translate } from "~/i18n/i18n.ts";
import { markNameKey } from "~/i18n/keyNames.ts";
import { type KeyStats, statOf } from "~/stats/keystats.ts";
import { carriedMark } from "~/text/arabic.ts";
import type { Vocalization } from "~/text/vocalization.ts";
import type { Metrics } from "~/typing/session.ts";
import { LADDER, type LadderProgress, type Rung } from "./ladder.ts";
import { drilledRung } from "./lesson.ts";

export interface LastLesson {
  readonly metrics: Metrics;
  readonly unlocked: Rung | undefined;
}

interface HudProps {
  readonly progress: LadderProgress;
  readonly stats: KeyStats;
  readonly vocalization: Vocalization;
  readonly last: LastLesson | null;
  readonly hidden?: boolean;
}

function unlockAnnouncement(unlocked: Rung | undefined, language: Language): string {
  if (unlocked === undefined) {
    return "";
  }
  const nameKey = markNameKey(unlocked.char);
  return translate(language, "hud.unlockedKey", {
    key: nameKey === undefined ? unlocked.char : translate(language, nameKey),
  });
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs tracking-widest whitespace-nowrap text-muted uppercase">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{children}</dd>
    </div>
  );
}

export function Hud({ progress, stats, vocalization, last, hidden = false }: HudProps) {
  const { t, language, formatAccuracy } = useI18n();
  const total = LADDER.rungs.length;
  const finished = progress.unlocked >= total;
  const rung = finished ? undefined : drilledRung(progress, vocalization);
  const stat = rung === undefined ? undefined : statOf(stats, rung.char);
  const typed = stat !== undefined && stat.attempts > 0;
  const nameKey = rung === undefined ? undefined : markNameKey(rung.char);
  const none = <span className="text-muted">{t("hud.none")}</span>;
  const announcement = unlockAnnouncement(last?.unlocked, language);

  return (
    <section hidden={hidden} aria-label={t("hud.label")} className="flex flex-col gap-3">
      <dl className="flex flex-wrap gap-x-8 gap-y-3">
        <Item label={t("hud.keys")}>{t("hud.keysValue", { count: progress.unlocked, total })}</Item>
        {rung !== undefined && (
          <>
            <Item label={t("hud.newest")}>
              <span lang="ar">{carriedMark(rung.char)}</span>
              {nameKey !== undefined && <span className="ms-1.5 font-sans">{t(nameKey)}</span>}
            </Item>
            <Item label={t("result.accuracy")}>{typed ? formatAccuracy(stat.recentAccuracy) : none}</Item>
            <Item label={t("hud.time")}>
              {typed && stat.timed > 0 ? t("hud.timeValue", { ms: stat.meanMs }) : none}
            </Item>
          </>
        )}
        <Item label={t("hud.last")}>
          {last === null
            ? none
            : t("hud.lastValue", { speed: last.metrics.cpm, accuracy: formatAccuracy(last.metrics.accuracy) })}
        </Item>
      </dl>
      {finished && <p className="text-sm text-muted">{t("hud.allUnlocked")}</p>}
      {!finished && rung === undefined && <p className="text-sm text-muted">{t("hud.marksNotTyped")}</p>}
      <p role="status" className="min-h-5 text-sm font-medium">
        {announcement}
      </p>
    </section>
  );
}
