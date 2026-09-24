import { useEffect, useMemo, useRef, useState } from "react";
import Attribution from "~/components/Attribution.tsx";
import CustomTextModal from "~/components/CustomTextModal.tsx";
import Header from "~/components/Header.tsx";
import Hud from "~/components/Hud.tsx";
import LayoutGuard from "~/components/LayoutGuard.tsx";
import PassageBar from "~/components/PassageBar.tsx";
import PassageDone from "~/components/PassageDone.tsx";
import RecitationBar from "~/components/RecitationBar.tsx";
import RecitationModal from "~/components/RecitationModal.tsx";
import SettingsModal from "~/components/SettingsModal.tsx";
import Stats from "~/components/Stats.tsx";
import SurahComplete from "~/components/SurahComplete.tsx";
import SurahMap from "~/components/SurahMap.tsx";
import TypingArea from "~/components/TypingArea.tsx";
import VirtualKeyboard from "~/components/VirtualKeyboard.tsx";
import { fontStack } from "~/engine/fonts.ts";
import { ayahAt } from "~/engine/lessons/lesson.ts";
import { completedSurahs, progressOf } from "~/engine/recitation/recitation.ts";
import { metrics as computeMetrics, expectedKey, isComplete } from "~/engine/session/session.ts";
import { useAudioCache } from "~/hooks/useAudioCache.ts";
import { useDockInset } from "~/hooks/useDockInset.ts";
import { useLatest } from "~/hooks/useLatest.ts";
import { useRecitationPlayer } from "~/hooks/useRecitationPlayer.ts";
import { recitationHref, targetOf, useRoute } from "~/hooks/useRoute.ts";
import { useTrainer } from "~/hooks/useTrainer.ts";

export default function App() {
  const { route, replace } = useRoute();
  const target = targetOf(route);
  const reciting = target?.mode === "recite";
  const [modal, setModal] = useState<"none" | "settings" | "recitation" | "custom">("none");
  const trainer = useTrainer({ target, enabled: target !== null && modal === "none" });
  const { profile, lesson, session, effectiveTier, latinDetected, shiftHeld, lastSummary } = trainer;
  const { settings } = profile;
  const live = computeMetrics(session, isComplete(session) ? undefined : performance.now());
  const nextChar = expectedKey(session);
  const audioCache = useAudioCache(modal === "recitation");
  const startAyah = trainer.reviewing || session.origin === 0 ? undefined : ayahAt(lesson, session.origin);
  const player = useRecitationPlayer({
    lesson,
    settings,
    updateSettings: trainer.updateSettings,
    active: reciting,
    startAyah,
  });
  const playingSpan =
    (player.ayah === null ? lesson.basmala : lesson.ayat.find((span) => span.ayah === player.ayah)) ?? null;
  const sounding = player.playing || player.progress > 0;
  const highlight = useMemo(
    () => (playingSpan !== null && sounding ? { start: playingSpan.start, end: playingSpan.end } : null),
    [playingSpan, sounding],
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--font-arabic-active", fontStack(settings.font));
  }, [settings.font]);

  const dockRef = useRef<HTMLDivElement>(null);
  useDockInset(dockRef, settings.showKeyboard && target !== null);

  const routeRef = useLatest(route);
  useEffect(() => {
    const { kind, surah, fromAyah } = lesson.source;
    const current = routeRef.current;
    if (kind !== "recite" || surah === undefined || fromAyah === undefined || current.page !== "recitation") {
      return;
    }
    if (current.surah !== null && (current.surah !== surah || current.ayah !== fromAyah)) {
      replace({ page: "recitation", surah, ayah: fromAyah });
    }
  }, [lesson, replace, routeRef]);

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-6"
      data-cy="app"
      data-route={route.page}
      data-font={settings.font}
    >
      <Header
        page={route.page}
        progress={profile.progress}
        stats={profile.stats}
        tier={effectiveTier}
        onOpenSettings={() => setModal("settings")}
      />

      {route.page === "stats" ? (
        <main className="flex flex-1 flex-col">
          <Stats
            progress={profile.progress}
            stats={profile.stats}
            history={profile.history}
            effectiveTier={effectiveTier}
          />
        </main>
      ) : target === null ? (
        <main className="flex flex-1 flex-col">
          <SurahMap
            recitation={profile.recitation}
            order={settings.surahOrder}
            onOrder={(surahOrder) => trainer.updateSettings({ surahOrder })}
            onReset={trainer.resetRecitation}
          />
        </main>
      ) : (
        <main className="flex flex-1 flex-col justify-center gap-10">
          <LayoutGuard latinDetected={latinDetected} onDismiss={trainer.dismissLatin} />

          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline justify-between gap-4">
                <Attribution source={lesson.source} />
                {lesson.source.kind === "custom" ? (
                  <button
                    type="button"
                    data-cy="edit-custom-text"
                    onClick={() => setModal("custom")}
                    className="shrink-0 text-xs text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
                  >
                    Edit text
                  </button>
                ) : null}
              </div>
              <PassageBar
                source={lesson.source}
                recitation={profile.recitation}
                onPrevious={trainer.previousPassage}
                onNext={trainer.nextPassage}
                onJump={(ayah) => trainer.goTo({ surah: lesson.source.surah ?? 1, ayah })}
              />
            </div>
            {trainer.reviewing ? (
              <PassageDone
                source={lesson.source}
                surahComplete={progressOf(profile.recitation, lesson.source.surah ?? 0).complete}
                onRedo={trainer.redoPassage}
                onNext={trainer.nextPassage}
              />
            ) : null}
            <TypingArea
              chars={session.chars}
              cursor={session.cursor}
              errorAt={session.errorAt}
              fontSize={settings.fontSize}
              highlight={highlight}
              ayat={lesson.ayat}
              breaks={lesson.breaks}
              centered={lesson.basmala}
              follow={!trainer.reviewing}
            />
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
              <Hud metrics={live} />
              {lastSummary !== null ? (
                <div data-cy="completion" className="flex flex-wrap items-baseline gap-2 text-xs">
                  <span className="uppercase tracking-wider text-stone-400">last</span>
                  <span className="font-mono tabular-nums text-stone-500">
                    <span data-cy="summary-cpm">{Math.round(lastSummary.cpm)}</span>
                    {" cpm · "}
                    <span data-cy="summary-accuracy">{Math.round(lastSummary.accuracy * 100)}</span>
                    {"% · "}
                    <span data-cy="summary-errors">{lastSummary.errors}</span>
                    {" errors"}
                  </span>
                </div>
              ) : null}
            </div>
            {lesson.source.kind === "recite" ? <RecitationBar player={player} /> : null}
          </section>

          {settings.showKeyboard ? (
            <div
              ref={dockRef}
              data-cy="keyboard-dock"
              className="sticky bottom-6 z-10 mx-auto w-fit rounded-2xl bg-stone-50/90 px-4 py-3 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 backdrop-blur-md dark:bg-stone-950/90 dark:ring-stone-100/10"
            >
              <VirtualKeyboard nextChar={nextChar} shiftHeld={shiftHeld} />
            </div>
          ) : null}
        </main>
      )}

      <SettingsModal
        open={modal === "settings"}
        settings={settings}
        autoTier={profile.progress.tier}
        onChange={trainer.updateSettings}
        onOpenRecitation={() => setModal("recitation")}
        onReset={trainer.resetProfile}
        onClose={() => setModal("none")}
      />

      <RecitationModal
        open={modal === "recitation"}
        settings={settings}
        recitation={profile.recitation}
        audioCache={audioCache}
        onChange={trainer.updateSettings}
        onGoTo={({ surah, ayah }) => {
          window.location.hash = recitationHref(surah, ayah);
        }}
        onBack={() => setModal("settings")}
        onClose={() => setModal("none")}
      />

      <SurahComplete
        completion={trainer.completion}
        completedSurahs={completedSurahs(profile.recitation)}
        onContinue={trainer.dismissCompletion}
        onReplay={trainer.replaySurah}
      />

      <CustomTextModal
        open={modal === "custom"}
        settings={settings}
        onChange={trainer.updateSettings}
        onClose={() => setModal("none")}
      />
    </div>
  );
}
