import { useEffect, useState } from "react";
import type { Progress } from "~/engine/progression.ts";
import corpus from "~generated/corpus.json";
import practice from "~generated/practice.json";
import { PracticeView } from "./PracticeView.tsx";
import { RecitationView, type SurahMeta } from "./RecitationView.tsx";
import { SettingsView } from "./SettingsView.tsx";
import { StatsView } from "./StatsView.tsx";
import { loadProfile, type Profile, saveProfile } from "./storage.ts";

const SURAHS = corpus.surahs as SurahMeta[];
const AYAT = corpus.ayat as string[];
const WORDS = practice.words as string[];

type Mode = "recitation" | "practice" | "stats" | "settings";

const MODES: readonly { id: Mode; label: string }[] = [
  { id: "recitation", label: "Recitation" },
  { id: "practice", label: "Practice" },
  { id: "stats", label: "Stats" },
  { id: "settings", label: "Settings" },
];

export function App() {
  const [profile, setProfile] = useState<Profile>(() => loadProfile());
  const [mode, setMode] = useState<Mode>("recitation");

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const setProgress = (progress: Progress) => {
    setProfile((current) => ({ ...current, progress }));
  };

  return (
    <div className="min-h-dvh flex flex-col">
      <header className="border-b border-stone-200 dark:border-stone-800">
        <nav aria-label="Modes" className="mx-auto flex max-w-3xl flex-wrap items-center gap-1 px-4 py-3">
          <span lang="ar" className="me-4 text-lg font-semibold">
            مفاتيح
          </span>
          {MODES.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setMode(entry.id)}
              aria-current={mode === entry.id ? "page" : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                mode === entry.id
                  ? "bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900"
                  : "hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 py-8">
        {mode === "recitation" ? (
          <RecitationView surahs={SURAHS} ayat={AYAT} profile={profile} onProfile={setProfile} />
        ) : null}
        {mode === "practice" ? (
          <PracticeView
            words={WORDS}
            progress={profile.progress}
            tierOverride={profile.settings.tierOverride}
            onProgress={setProgress}
          />
        ) : null}
        {mode === "stats" ? <StatsView progress={profile.progress} /> : null}
        {mode === "settings" ? <SettingsView profile={profile} onProfile={setProfile} /> : null}
      </main>

      <footer className="border-t border-stone-200 px-4 py-4 text-center text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        <p>
          Qur'an text:{" "}
          <a className="underline" href="https://tanzil.net" rel="noreferrer" target="_blank">
            Tanzil Project
          </a>{" "}
          (CC BY 3.0), shown complete and in order, never as drill material. Recitation: Abdul Basit ʿAbd us-Samad,{" "}
          <a className="underline" href="https://everyayah.com" rel="noreferrer" target="_blank">
            EveryAyah
          </a>
          . Practice words are secular everyday Arabic, authored for Mafatih.
        </p>
      </footer>
    </div>
  );
}
