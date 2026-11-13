import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { RecitationRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { unlockedMarks } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { requiredMarks } from "~/text/vocalization.ts";
import { LiveStats } from "~/typing/LiveStats.tsx";
import { isComplete, metricsOf } from "~/typing/session.ts";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { useTrainer } from "~/typing/useTrainer.ts";
import { useDialogOpen } from "~/ui/dialogs.ts";
import { LessonSummary } from "~/ui/LessonSummary.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { BUTTON, PRIMARY_BUTTON } from "~/ui/styles.ts";
import { Player } from "./audio/Player.tsx";
import { type Player as PlayerHandle, usePlayer } from "./audio/usePlayer.ts";
import { PassageFooter } from "./PassageFooter.tsx";
import type { Passage } from "./passage.ts";
import { surahName } from "./quran.ts";
import { SurahMap } from "./SurahMap.tsx";
import { type Recitation, useRecitation } from "./useRecitation.ts";

interface PassageLessonProps {
  readonly passage: Passage;
  readonly recitation: Recitation;
  readonly player: PlayerHandle;
  readonly describedBy: string;
  readonly onFinished: (finished: boolean) => void;
  readonly refocus: RefObject<() => void>;
}

function PassageLesson({ passage, recitation, player, describedBy, onFinished, refocus }: PassageLessonProps) {
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

  useEffect(() => {
    refocus.current = focus;
    return () => {
      refocus.current = () => undefined;
    };
  }, [focus, refocus]);
  const { continues, completions, endsTheOrder, meta } = recitation;

  useEffect(() => {
    if (continues) {
      focus();
      recitation.consumeContinue();
    }
  }, [continues, focus, recitation]);

  const finished = isComplete(session);

  useEffect(() => {
    onFinished(finished);
    return () => onFinished(false);
  }, [finished, onFinished]);

  const metrics = finished ? metricsOf(session) : null;
  const completed = completions !== null;
  const nextLabel = endsTheOrder ? "recitation.startAgain" : completed ? "completion.next" : "recitation.next";

  return (
    <>
      <TypingSurface
        trainer={trainer}
        settings={settings}
        apparatus={signs}
        playing={player.state.status === "playing" ? (player.clip?.span ?? null) : null}
        describedBy={describedBy}
      />
      <LiveStats session={session} />
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
  const { t, language, formatNumber } = useI18n();
  const { settings, ladder } = useProfile().profile;
  const recitation = useRecitation(surah, ayah);
  const { meta, from, to, passage, failed } = recitation;
  const dialogOpen = useDialogOpen();
  const [lessonFinished, setLessonFinished] = useState(false);
  const [shown, setShown] = useState(passage);
  if (passage !== null && passage !== shown) {
    setShown(passage);
  }
  const refocus = useRef<() => void>(() => undefined);
  const player = usePlayer({
    passage,
    reciter: settings.reciter,
    volume: settings.volume,
    muted: settings.muted,
    whole: settings.playWhole,
    loop: settings.loop,
    held: dialogOpen,
    resting: lessonFinished,
  });
  const marksTyped = requiredMarks(settings.vocalization, unlockedMarks(ladder)).size > 0;
  const range = t(from === to ? "recitation.ayah" : "recitation.ayat", { from, to, count: meta.ayat });
  const shortRange = from === to ? formatNumber(from) : `${formatNumber(from)}\u2013${formatNumber(to)}`;
  const label = `${language === "ar" ? meta.name : meta.tname} \u00b7 ${shortRange}`;
  const hintId = `hint-${meta.n}`;

  return (
    <div className="flex flex-1 flex-col gap-3">
      <PageHeading quiet>
        <span id={`passage-${meta.n}`}>{label}</span>
      </PageHeading>
      <p role="status" className="sr-only">
        {t("bar.announce", { surah: surahName(meta, language), range })}
      </p>
      <p id={hintId} className="sr-only">
        {t(marksTyped ? "recitation.hintMarks" : "recitation.hintLetters")}
      </p>
      <p role="status" className="text-center text-sm text-muted empty:hidden">
        {passage === null && !failed ? t("recitation.loading") : ""}
      </p>
      {passage === null && !failed && <div aria-hidden="true" className="min-h-[40dvh]" />}
      {passage !== null && (
        <PassageLesson
          key={`${passage.surah}:${passage.fromAyah}`}
          passage={passage}
          recitation={recitation}
          player={player}
          describedBy={`passage-${meta.n} ${hintId}`}
          onFinished={setLessonFinished}
          refocus={refocus}
        />
      )}
      {failed && (
        <div className="flex flex-col items-center gap-3">
          <p role="alert" className="text-sm font-medium">
            {t("recitation.loadFailed")}
          </p>
          <button type="button" onClick={() => window.location.reload()} className={PRIMARY_BUTTON}>
            {t("action.reload")}
          </button>
        </div>
      )}
      <PassageFooter
        meta={meta}
        typed={recitation.typed}
        previous={recitation.previous}
        next={recitation.next}
        onGo={recitation.go}
        audio={
          shown === null ? null : (
            <Player player={player} passage={shown} settings={settings} refocus={() => refocus.current()} />
          )
        }
      />
    </div>
  );
}

export function RecitationPage({ route }: { route: RecitationRoute }) {
  return route.surah === null ? <SurahMap /> : <PassagePage surah={route.surah} ayah={route.ayah} />;
}
