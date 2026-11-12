import { useEffect, useMemo } from "react";
import type { RecitationRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { unlockedMarks } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { requiredMarks } from "~/text/vocalization.ts";
import { isComplete, metricsOf } from "~/typing/session.ts";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { useTrainer } from "~/typing/useTrainer.ts";
import { LessonSummary } from "~/ui/LessonSummary.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { BUTTON, PRIMARY_BUTTON } from "~/ui/styles.ts";
import { PassageBar } from "./PassageBar.tsx";
import type { Passage } from "./passage.ts";
import { surahName } from "./quran.ts";
import { SurahMap } from "./SurahMap.tsx";
import { type Recitation, useRecitation } from "./useRecitation.ts";

interface PassageLessonProps {
  readonly passage: Passage;
  readonly recitation: Recitation;
  readonly describedBy: string;
}

function PassageLesson({ passage, recitation, describedBy }: PassageLessonProps) {
  const { t, language, formatNumber, formatDuration } = useI18n();
  const { settings } = useProfile().profile;
  const checkpoints = useMemo(() => passage.ayat.map((ayah) => ayah.lastUnit), [passage]);
  const signs = useMemo(() => passage.ayat.map((ayah) => ayah.sign), [passage]);
  const trainer = useTrainer({
    prompt: passage.prompt,
    options: { requireBackspace: settings.requireBackspace },
    onComplete: recitation.recordPassage,
    checkpoints,
    onCheckpoint: recitation.recordAyah,
  });
  const { focus, session } = trainer;
  const { continues, completions, endsTheOrder, meta } = recitation;

  useEffect(() => {
    if (continues) {
      focus();
      recitation.consumeContinue();
    }
  }, [continues, focus, recitation]);

  const metrics = isComplete(session) ? metricsOf(session) : null;
  const completed = completions !== null;
  const nextLabel = endsTheOrder ? "recitation.startAgain" : completed ? "completion.next" : "recitation.next";

  return (
    <>
      <TypingSurface
        trainer={trainer}
        settings={settings}
        centredOpening={passage.basmala !== null}
        apparatus={signs}
        describedBy={describedBy}
      />
      {metrics !== null && (
        <LessonSummary
          metrics={metrics}
          title={completed ? t("completion.title", { surah: surahName(meta, language) }) : undefined}
          details={
            completed
              ? [
                  { label: t("completion.ayat"), value: formatNumber(meta.ayat) },
                  { label: t("completion.times"), value: formatNumber(completions) },
                  { label: t("completion.time"), value: formatDuration(metrics.elapsedMs) },
                ]
              : []
          }
          note={endsTheOrder ? t("recitation.orderEnds") : undefined}
        >
          <button type="button" onClick={recitation.advance} className={PRIMARY_BUTTON}>
            {t(nextLabel)}
          </button>
          <button
            type="button"
            onClick={() => {
              recitation.forgetCompletion();
              trainer.restart();
            }}
            className={BUTTON}
          >
            {t("result.again")}
          </button>
        </LessonSummary>
      )}
    </>
  );
}

function PassagePage({ surah, ayah }: { surah: number; ayah: number | null }) {
  const { t, language } = useI18n();
  const { settings, ladder } = useProfile().profile;
  const recitation = useRecitation(surah, ayah);
  const { meta, from, to, passage, failed } = recitation;
  const marksTyped = requiredMarks(settings.vocalization, unlockedMarks(ladder)).size > 0;
  const range = t(from === to ? "recitation.ayah" : "recitation.ayat", { from, to, count: meta.ayat });

  return (
    <div className="flex flex-col gap-3">
      <div id={`passage-${meta.n}`}>
        <PageHeading>
          {language === "ar" ? (
            meta.name
          ) : (
            <>
              {meta.tname}{" "}
              <span lang="ar" dir="rtl" className="font-normal">
                {meta.name}
              </span>
            </>
          )}
        </PageHeading>
        <p className="text-sm text-muted">{range}</p>
      </div>
      <p role="status" className="sr-only">
        {t("bar.announce", { surah: surahName(meta, language), range })}
      </p>
      <div>
        <p className="text-sm text-muted">{t(marksTyped ? "recitation.hintMarks" : "recitation.hintLetters")}</p>
        <p role="status" className="min-h-5 text-sm text-muted">
          {passage === null && !failed ? t("recitation.loading") : ""}
        </p>
      </div>
      {passage === null && !failed && <div aria-hidden="true" className="min-h-[40dvh]" />}
      {passage !== null && (
        <PassageLesson
          key={`${passage.surah}:${passage.fromAyah}`}
          passage={passage}
          recitation={recitation}
          describedBy={`passage-${meta.n}`}
        />
      )}
      {failed && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm font-medium">
            {t("recitation.loadFailed")}
          </p>
          <button type="button" onClick={() => window.location.reload()} className={PRIMARY_BUTTON}>
            {t("action.reload")}
          </button>
        </div>
      )}
      <PassageBar
        meta={meta}
        from={from}
        typed={recitation.typed}
        previous={recitation.previous}
        next={recitation.next}
        onGo={recitation.go}
      />
    </div>
  );
}

export function RecitationPage({ route }: { route: RecitationRoute }) {
  return route.surah === null ? <SurahMap /> : <PassagePage surah={route.surah} ayah={route.ayah} />;
}
