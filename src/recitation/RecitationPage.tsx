import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import type { RecitationRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { unlockedMarks } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { requiredMarks } from "~/text/vocalization.ts";
import { LiveStats } from "~/typing/LiveStats.tsx";
import { isComplete } from "~/typing/session.ts";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { useTrainer } from "~/typing/useTrainer.ts";
import { useDialogOpen } from "~/ui/dialogs.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PRIMARY_BUTTON } from "~/ui/styles.ts";
import { Player } from "./audio/Player.tsx";
import { type Player as PlayerHandle, usePlayer } from "./audio/usePlayer.ts";
import { PassageFooter } from "./PassageFooter.tsx";
import { PassagePager } from "./PassagePager.tsx";
import type { Passage } from "./passage.ts";
import { requireSurahMeta, surahName } from "./quran.ts";
import { SurahComplete } from "./SurahComplete.tsx";
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
  const { continues, finish, endsTheOrder, meta, target, from, advance, restartSurah, consumeContinue } = recitation;

  useEffect(() => {
    refocus.current = focus;
    return () => {
      refocus.current = () => undefined;
    };
  }, [focus, refocus]);

  useEffect(() => {
    if (continues) {
      focus();
      consumeContinue();
    }
  }, [continues, focus, consumeContinue]);

  const finished = isComplete(session);

  useEffect(() => {
    onFinished(finished);
    return () => onFinished(false);
  }, [finished, onFinished]);

  const again = () => {
    restartSurah();
    if (from === 1) {
      trainer.restart();
    }
  };

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
      <SurahComplete
        meta={meta}
        finish={finish}
        next={requireSurahMeta(target.surah)}
        endsTheOrder={endsTheOrder}
        onContinue={advance}
        onAgain={again}
      />
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

  const pageRef = useRef<HTMLDivElement>(null);
  const { go, next, previous } = recitation;
  useEffect(() => {
    const page = pageRef.current;
    if (page === null) {
      return;
    }
    const turnPage = (event: globalThis.KeyboardEvent) => {
      const { target, key } = event;
      if (target instanceof Element && (target.closest("dialog") !== null || target.matches('input[type="range"]'))) {
        return;
      }
      if (key === "PageDown" || key === "PageUp") {
        event.preventDefault();
        go(key === "PageDown" ? next : previous, target instanceof Element && target.matches("[data-typing-input]"));
      }
    };
    page.addEventListener("keydown", turnPage);
    return () => page.removeEventListener("keydown", turnPage);
  }, [go, next, previous]);

  return (
    <div ref={pageRef} className="flex flex-1 flex-col gap-3">
      <PassagePager previous={recitation.previous} next={recitation.next} onGo={recitation.go}>
        <PageHeading quiet>
          <span id={`passage-${meta.n}`}>{label}</span>
        </PageHeading>
      </PassagePager>
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
