import { useEffect, useMemo, useState } from "react";
import Attribution from "~/components/Attribution.tsx";
import CustomTextModal from "~/components/CustomTextModal.tsx";
import FocusLetter from "~/components/FocusLetter.tsx";
import Hud from "~/components/Hud.tsx";
import LayoutGuard from "~/components/LayoutGuard.tsx";
import RecitationBar from "~/components/RecitationBar.tsx";
import RecitationModal from "~/components/RecitationModal.tsx";
import SettingsModal from "~/components/SettingsModal.tsx";
import Stats from "~/components/Stats.tsx";
import StoryBar from "~/components/StoryBar.tsx";
import StoryMap from "~/components/StoryMap.tsx";
import SurahComplete from "~/components/SurahComplete.tsx";
import TypingArea from "~/components/TypingArea.tsx";
import VirtualKeyboard from "~/components/VirtualKeyboard.tsx";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import { fontStack } from "~/engine/fonts.ts";
import { metrics as computeMetrics, isComplete } from "~/engine/session/session.ts";
import { completedSurahs, type StoryPosition } from "~/engine/story/story.ts";
import { useAudioCache } from "~/hooks/useAudioCache.ts";
import { useRecitation } from "~/hooks/useRecitation.ts";
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
  const nextChar = session.chars[session.cursor];
  const audioCache = useAudioCache(modal === "recitation");
  const recitation = useRecitation({
    lesson,
    settings,
    updateSettings: trainer.updateSettings,
  });
  const playingSpan =
    (recitation.ayah === null ? lesson.basmala : lesson.ayat.find((span) => span.ayah === recitation.ayah)) ?? null;
  const reciting = recitation.playing || recitation.progress > 0;
  const highlight = useMemo(
    () => (playingSpan !== null && reciting ? { start: playingSpan.start, end: playingSpan.end } : null),
    [playingSpan, reciting],
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--font-arabic-active", fontStack(settings.font));
  }, [settings.font]);

  const playFromMap = (position: StoryPosition) => {
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
          <NavLink target="story" current={route} label="Story" />
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

      {route === "story" ? (
        <main className="flex flex-1 flex-col">
          <StoryMap
            story={profile.story}
            order={settings.surahOrder}
            onOrder={(surahOrder) => trainer.updateSettings({ surahOrder })}
            onPlay={playFromMap}
            onReset={trainer.resetStory}
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
              <StoryBar
                source={lesson.source}
                story={profile.story}
                onPrevious={trainer.previousPassage}
                onNext={trainer.nextPassage}
                onJump={(ayah) => trainer.goTo({ surah: lesson.source.surah ?? 1, ayah })}
              />
            </div>
            <TypingArea
              chars={session.chars}
              cursor={session.cursor}
              errorAt={session.errorAt}
              fontSize={settings.fontSize}
              highlight={highlight}
              ayat={lesson.ayat}
              breaks={lesson.breaks}
              centered={lesson.basmala}
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
            {lesson.source.kind === "recite" ? <RecitationBar recitation={recitation} /> : null}
          </section>

          {settings.showKeyboard ? (
            <div
              data-cy="keyboard-dock"
              className="sticky bottom-6 z-10 mx-auto w-fit rounded-2xl bg-stone-50/90 px-4 py-3 shadow-lg shadow-stone-900/5 ring-1 ring-stone-900/5 backdrop-blur-md dark:bg-stone-950/90 dark:ring-stone-100/10"
            >
              <VirtualKeyboard layout={settings.layout} nextChar={nextChar} shiftHeld={shiftHeld} />
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
        story={profile.story}
        audioCache={audioCache}
        onChange={trainer.updateSettings}
        onGoTo={trainer.goTo}
        onBack={() => setModal("settings")}
        onClose={() => setModal("none")}
      />

      <SurahComplete
        completion={trainer.completion}
        completedSurahs={completedSurahs(profile.story)}
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
