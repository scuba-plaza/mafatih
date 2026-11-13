import { type ReactNode, useId, useLayoutEffect, useRef, useState } from "react";
import { PAGE_TITLES } from "~/app/pages.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { markNameKey } from "~/i18n/keyNames.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { dottedMark, isMark } from "~/text/arabic.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { Segmented } from "~/ui/Segmented.tsx";
import { MODES, type Mode } from "./history.ts";
import { keyRows, recentLessons } from "./rows.ts";

const CELL = "px-2 py-1.5 text-start align-top";
const HEAD = `${CELL} text-xs font-normal tracking-wide text-muted`;
const ROW = "border-t border-faint";
const SECTION_TITLE = "text-xs tracking-widest text-muted uppercase";
const ARABIC_SCRIPT = /\p{Script_Extensions=Arabic}/u;

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

  const region = scrollable ? ({ tabIndex: 0, role: "group", "aria-label": label } as const) : {};
  return (
    <div ref={wrapper} className="overflow-x-auto" {...region}>
      {children}
    </div>
  );
}

function KeyLabel({ char }: { char: string }) {
  const { t } = useI18n();
  if (char === " ") {
    return t("stats.space");
  }
  if (isMark(char)) {
    const nameKey = markNameKey(char);
    return (
      <>
        <span lang="ar" className="text-lg">
          {dottedMark(char)}
        </span>
        {nameKey !== undefined && <> {t(nameKey)}</>}
      </>
    );
  }
  return ARABIC_SCRIPT.test(char) ? (
    <span lang="ar" className="text-lg">
      {char}
    </span>
  ) : (
    char
  );
}

export function StatsPage() {
  const { t, formatNumber, formatPercent, formatDate } = useI18n();
  const { profile } = useProfile();
  const [mode, setMode] = useState<Mode>(profile.history.at(-1)?.mode ?? "practice");
  const keysTitleId = useId();
  const lessonsTitleId = useId();
  const rows = keyRows(profile.stats[mode]);
  const lessons = recentLessons(profile.history);
  const modeName = t(PAGE_TITLES[mode]);
  const keysTitle = t("stats.keys", { mode: modeName });

  return (
    <div className="flex flex-col gap-6">
      <PageHeading>{t("nav.stats")}</PageHeading>
      <Segmented<Mode>
        legend={t("stats.mode")}
        value={mode}
        options={MODES.map((value) => ({ value, label: t(PAGE_TITLES[value]) }))}
        onChange={setMode}
      />
      <p role="status" className="sr-only">
        {t("stats.announce", { mode: modeName, count: rows.length })}
      </p>
      <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-2 lg:items-start">
        <section className="flex min-w-0 flex-col gap-3">
          <h2 id={keysTitleId} className={SECTION_TITLE}>
            {keysTitle}
          </h2>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">{t("stats.empty", { mode: modeName })}</p>
          ) : (
            <Scrollable label={t("stats.scrollable", { name: keysTitle })}>
              <table aria-labelledby={keysTitleId} className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>
                      {t("stats.key")}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("stats.time")}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("stats.firstTry")}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("stats.attempts")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className={ROW}>
                      <th scope="row" className={`${CELL} font-medium`}>
                        <KeyLabel char={row.key} />
                      </th>
                      <td className={CELL}>{row.meanMs === null ? t("hud.none") : formatNumber(row.meanMs)}</td>
                      <td className={CELL}>
                        {formatPercent(row.accuracy)}
                        <span
                          aria-hidden="true"
                          className="mt-1 block h-1 w-full max-w-24 rounded-full bg-line forced-colors:bg-[GrayText]"
                        >
                          <span
                            className="block h-full rounded-full bg-accent forced-colors:bg-[Highlight]"
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
        </section>
        <section className="flex min-w-0 flex-col gap-3">
          <h2 id={lessonsTitleId} className={SECTION_TITLE}>
            {t("stats.lessons")}
          </h2>
          {lessons.length === 0 ? (
            <p className="text-sm text-muted">{t("stats.noLessons")}</p>
          ) : (
            <Scrollable label={t("stats.scrollable", { name: t("stats.lessons") })}>
              <table aria-labelledby={lessonsTitleId} className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className={HEAD}>
                      {t("stats.date")}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("stats.modeColumn")}
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("result.speedShort")}
                      <span className="sr-only"> ({t("result.unit")})</span>
                    </th>
                    <th scope="col" className={HEAD}>
                      {t("result.accuracy")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((lesson) => (
                    <tr key={lesson.id} className={ROW}>
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
        </section>
      </div>
    </div>
  );
}
