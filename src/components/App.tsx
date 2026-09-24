import { useEffect, useMemo, useRef, useState } from "react";
import Attribution from "~/components/Attribution.tsx";
import CustomTextModal from "~/components/CustomTextModal.tsx";
import FocusLetter from "~/components/FocusLetter.tsx";
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
import { letterOrder } from "~/engine/corpus/corpus.ts";
import { fontStack } from "~/engine/fonts.ts";
import { completedSurahs, progressOf, type RecitationPosition } from "~/engine/recitation/recitation.ts";
import { metrics as computeMetrics, expectedKey, isComplete } from "~/engine/session/session.ts";
import { useAudioCache } from "~/hooks/useAudioCache.ts";
import { useRecitationPlayer } from "~/hooks/useRecitationPlayer.ts";
import { ROUTE_HASH, type Route, useRoute } from "~/hooks/useRoute.ts";
import { useTrainer } from "~/hooks/useTrainer.ts";

const NAV = "text-xs transition-colors";
const NAV_ON = "text-stone-900 dark:text-stone-100";
const NAV_OFF = "text-stone-400 hover:text-stone-900 dark:hover:text-stone-100";

function NavLink({ target, current, label }: { target: Route; current: Route; label: string }) {
  return (
    <a
      data-cy={`nav-${target}`}
      href={ROUTE_HASH[target]}
      className={`${NAV} ${target === current ? NAV_ON : NAV_OFF}`}
    >
      {label}
    </a>
  );
}

export default function App() {
  const route: Route = useRoute();
  const [modal, setModal] = useState<"none" | "settings" | "recitation" | "custom">("none");
  const trainer = useTrainer({ enabled: route === "practice" && modal === "none" });
  const { profile, lesson, session, effectiveTier, latinDetected, shiftHeld, lastSummary } = trainer;
  const { settings } = profile;
  const live = computeMetrics(session, isComplete(session) ? undefined : performance.now());
  const nextChar = expectedKey(session);
  const audioCache = useAudioCache(modal === "recitation");
  const startAyah =
    trainer.reviewing || session.origin === 0
      ? undefined
      : lesson.ayat.find((span) => span.start <= session.origin && session.origin < span.end)?.ayah;
  const player = useRecitationPlayer({
    lesson,
    settings,
    updateSettings: trainer.updateSettings,
    active: route === "practice",
    startAyah,
  });
  const playingSpan =
    (player.ayah === null ? lesson.basmala : lesson.ayat.find((span) => span.ayah === player.ayah)) ?? null;
  const reciting = player.playing || player.progress > 0;
  const highlight = useMemo(
    () => (playingSpan !== null && reciting ? { start: playingSpan.start, end: playingSpan.end } : null),
    [playingSpan, reciting],
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--font-arabic-active", fontStack(settings.font));
  }, [settings.font]);

  const dockRef = useRef<HTMLDivElement>(null);
  const docked = settings.showKeyboard && route === "practice";

  useEffect(() => {
    const root = document.documentElement;
    const dock = dockRef.current;
    if (!docked || dock === null) {
      root.style.setProperty("--keyboard-dock-inset", "0px");
      return;
    }
    const measure = () => {
      const offset = Number.parseFloat(getComputedStyle(dock).bottom) || 0;
      root.style.setProperty("--keyboard-dock-inset", `${dock.offsetHeight + offset}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => {
      observer.disconnect();
      root.style.setProperty("--keyboard-dock-inset", "0px");
    };
  }, [docked]);

  const playFromMap = (position: RecitationPosition) => {
    trainer.goTo(position);
    window.location.hash = ROUTE_HASH.practice;
  };

  return (
    <div
      className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-10 px-6 py-6"
      data-cy="app"
      data-route={route}
      data-font={settings.font}
    >
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <a href={ROUTE_HASH.practice} className="flex items-baseline gap-2" aria-label="Mafatih">
          <span lang="ar" className="font-arabic text-xl leading-none text-stone-900 dark:text-stone-100">
            مفاتيح
          </span>
        </a>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
          <span data-cy="progress-summary" className="whitespace-nowrap font-mono text-xs tabular-nums text-stone-400">
            <span data-cy="unlocked-count">{profile.progress.unlockedCount}</span>
            {`/${letterOrder.length} · `}
            <span data-cy="tier">{effectiveTier}</span>
          </span>
          <span className="hidden font-mono text-xs tabular-nums text-stone-400 sm:inline">
            <FocusLetter progress={profile.progress} stats={profile.stats} />
          </span>
          <NavLink target="practice" current={route} label="Practice" />
          <NavLink target="recitation" current={route} label="Recitation" />
          <NavLink target="stats" current={route} label="Stats" />
          <button
            type="button"
            data-cy="open-settings"
            onClick={() => setModal("settings")}
            className={`${NAV} ${NAV_OFF}`}
          >
            Settings
          </button>
        </nav>
      </header>

      {route === "recitation" ? (
        <main className="flex flex-1 flex-col">
          <SurahMap
            recitation={profile.recitation}
            order={settings.surahOrder}
            onOrder={(surahOrder) => trainer.updateSettings({ surahOrder })}
            onPlay={playFromMap}
            onReset={trainer.resetRecitation}
          />
        </main>
      ) : route === "stats" ? (
        <main className="flex flex-1 flex-col">
          <Stats
            progress={profile.progress}
            stats={profile.stats}
            history={profile.history}
            effectiveTier={effectiveTier}
          />
        </main>
      ) : (
        <main className="flex flex-1 flex-col justify-center gap-10">
          <LayoutGuard latinDetected={latinDetected} onDismiss={trainer.dismissLatin} />

          <section className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <Attribution source={lesson.source} />
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
        onOpenCustomText={() => setModal("custom")}
        onReset={trainer.resetProfile}
        onClose={() => setModal("none")}
      />

      <RecitationModal
        open={modal === "recitation"}
        settings={settings}
        recitation={profile.recitation}
        audioCache={audioCache}
        onChange={trainer.updateSettings}
        onGoTo={trainer.goTo}
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
        onBack={() => setModal("settings")}
        onClose={() => setModal("none")}
      />
    </div>
  );
}
