import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { PAGE_TITLES } from "~/app/pages.ts";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { dottedMark, isMark } from "~/text/arabic.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { RadioGroup } from "~/ui/RadioGroup.tsx";
import { MODES, type Mode } from "./history.ts";
import { keyRows, recentLessons } from "./rows.ts";

const EMPTY: Record<Mode, MessageKey> = {
  practice: "stats.empty.practice",
  recitation: "stats.empty.recitation",
  custom: "stats.empty.custom",
};

const CELL = "px-2 py-1.5 text-start align-top";
const HEAD = `${CELL} font-medium text-muted`;
const ROW = "border-t border-line";

function Scrollable({ label, children }: { label: string; children: ReactNode }) {
  const wrapper = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useLayoutEffect(() => {
    const element = wrapper.current;
    if (element === null) {
      return;
    }
    const measure = () => setScrollable(element.scrollWidth > element.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (element.firstElementChild !== null) {
      observer.observe(element.firstElementChild);
    }
    return () => observer.disconnect();
  }, []);

  const region = scrollable ? ({ tabIndex: 0, role: "region", "aria-label": label } as const) : {};
  return (
    <div ref={wrapper} className="overflow-x-auto" {...region}>
      {children}
    </div>
  );
}

export function StatsPage() {
  const { t, formatNumber, formatPercent, formatDate } = useI18n();
  const { profile } = useProfile();
  const [mode, setMode] = useState<Mode>(profile.history.at(-1)?.mode ?? "practice");
  const rows = keyRows(profile.stats[mode]);
  const lessons = recentLessons(profile.history);

  const keysCaption = t("stats.keys", { mode: t(PAGE_TITLES[mode]) });
  const keyLabel = (key: string) => (key === " " ? t("stats.space") : isMark(key) ? dottedMark(key) : key);

  return (
    <div className="flex flex-col gap-4">
      <PageHeading>{t("nav.stats")}</PageHeading>
      <RadioGroup<Mode>
        legend={t("stats.mode")}
        value={mode}
        options={MODES.map((value) => ({ value, label: t(PAGE_TITLES[value]) }))}
        onChange={setMode}
        row
      />
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t(EMPTY[mode])}</p>
      ) : (
        <Scrollable label={keysCaption}>
          <table className="w-full border-collapse text-sm">
            <caption className="pb-1 text-start font-semibold">{keysCaption}</caption>
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  {t("stats.key")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("stats.speed")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("result.accuracy")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("stats.attempts")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className={ROW}>
                  <th scope="row" lang="ar" className={`${CELL} text-lg font-medium`}>
                    {keyLabel(row.key)}
                  </th>
                  <td className={CELL}>{row.meanMs === null ? t("hud.none") : formatNumber(row.meanMs)}</td>
                  <td className={CELL}>
                    {formatPercent(row.accuracy)}
                    <span aria-hidden="true" className="mt-1 block h-1 w-full max-w-24 rounded-full bg-line">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${row.accuracy * 100}%` }}
                      />
                    </span>
                  </td>
                  <td className={CELL}>{formatNumber(row.attempts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scrollable>
      )}
      {lessons.length === 0 ? (
        <p className="text-sm text-muted">{t("stats.noLessons")}</p>
      ) : (
        <Scrollable label={t("stats.lessons")}>
          <table className="w-full border-collapse text-sm">
            <caption className="pb-1 text-start font-semibold">{t("stats.lessons")}</caption>
            <thead>
              <tr>
                <th scope="col" className={HEAD}>
                  {t("stats.date")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("stats.modeColumn")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("result.speed")}
                </th>
                <th scope="col" className={HEAD}>
                  {t("result.accuracy")}
                </th>
              </tr>
            </thead>
            <tbody>
              {lessons.map((lesson) => (
                <tr key={lesson.at} className={ROW}>
                  <td className={CELL}>{formatDate(lesson.at)}</td>
                  <td className={CELL}>{t(PAGE_TITLES[lesson.mode])}</td>
                  <td className={CELL}>{lesson.cpm === null ? t("hud.none") : formatNumber(lesson.cpm)}</td>
                  <td className={CELL}>{formatPercent(lesson.accuracy)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Scrollable>
      )}
    </div>
  );
}
