import { useEffect, useMemo, useRef, useState } from "react";
import { stripToTier } from "~/engine/normalize.ts";
import { advance, effectiveTier, recordAttempt } from "~/engine/progression.ts";
import type { CharAttempt } from "~/engine/typing.ts";
import { Confirm } from "./Confirm.tsx";
import { Keyboard } from "./Keyboard.tsx";
import type { Profile, SurahProgress } from "./storage.ts";
import { TypingArea } from "./TypingArea.tsx";
import { useTyping } from "./useTyping.ts";

export interface SurahMeta {
  n: number;
  name: string;
  tname: string;
  ename: string;
  ayat: number;
  type: string;
}

interface RecitationViewProps {
  surahs: readonly SurahMeta[];
  ayat: readonly string[];
  profile: Profile;
  onProfile: (profile: Profile) => void;
}

function ayatOf(surahs: readonly SurahMeta[], ayat: readonly string[], surah: number): string[] {
  let offset = 0;
  for (const meta of surahs) {
    if (meta.n === surah) {
      return ayat.slice(offset, offset + meta.ayat);
    }
    offset += meta.ayat;
  }
  return [];
}

function linesOf(text: string, width: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current !== "" && `${current} ${word}`.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current === "" ? word : `${current} ${word}`;
    }
  }
  if (current !== "") {
    lines.push(current);
  }
  return lines;
}

function audioUrl(surah: number, ayah: number): string {
  return `https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/${String(surah).padStart(3, "0")}${String(ayah).padStart(3, "0")}.mp3`;
}

export function RecitationView({ surahs, ayat, profile, onProfile }: RecitationViewProps) {
  const [surah, setSurah] = useState<number | null>(null);

  if (surah === null) {
    return <SurahList surahs={surahs} profile={profile} onOpen={setSurah} />;
  }
  return (
    <SurahSession
      surahs={surahs}
      ayat={ayat}
      surah={surah}
      profile={profile}
      onProfile={onProfile}
      onBack={() => setSurah(null)}
    />
  );
}

function SurahList({
  surahs,
  profile,
  onOpen,
}: {
  surahs: readonly SurahMeta[];
  profile: Profile;
  onOpen: (surah: number) => void;
}) {
  return (
    <section aria-labelledby="recitation-heading" className="mx-auto max-w-3xl px-4">
      <h1 id="recitation-heading" className="mb-4 text-xl font-semibold">
        Recitation
      </h1>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {surahs.map((meta) => {
          const saved = profile.recitation[String(meta.n)];
          return (
            <li key={meta.n}>
              <button
                type="button"
                onClick={() => onOpen(meta.n)}
                className="flex w-full flex-col items-start rounded-lg border border-stone-300 p-3 text-start hover:border-stone-400 dark:border-stone-700 dark:hover:border-stone-500"
                aria-label={`${meta.tname}${saved?.done === true ? ", completed" : ""}${
                  saved?.star === true ? " with star" : ""
                }, ${saved === undefined ? "not started" : `ayah ${Math.min(saved.ayah + 1, meta.ayat)} of ${meta.ayat}`}`}
              >
                <span lang="ar" className="text-lg">
                  {meta.name} {saved?.done === true ? "✓" : ""}
                  {saved?.star === true ? "★" : ""}
                </span>
                <span className="text-sm text-stone-500 dark:text-stone-400">
                  {meta.tname} ·{" "}
                  {saved === undefined ? "not started" : `ayah ${Math.min(saved.ayah + 1, meta.ayat)} of ${meta.ayat}`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SurahSession({
  surahs,
  ayat,
  surah,
  profile,
  onProfile,
  onBack,
}: {
  surahs: readonly SurahMeta[];
  ayat: readonly string[];
  surah: number;
  profile: Profile;
  onProfile: (profile: Profile) => void;
  onBack: () => void;
}) {
  const meta = surahs.find((entry) => entry.n === surah);
  const surahAyat = useMemo(() => (meta === undefined ? [] : ayatOf(surahs, ayat, surah)), [surahs, ayat, surah, meta]);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [ayahAccuracy, setAyahAccuracy] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const attemptsRef = useRef<CharAttempt[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  if (meta === undefined) {
    return null;
  }
  const saved = profile.recitation[String(surah)] ?? { ayah: 0, done: false, star: false, bestAccuracy: 0 };
  const tier = effectiveTier(profile.progress, profile.settings.tierOverride);
  const ayahIndex = saved.done ? meta.ayat - 1 : Math.min(saved.ayah, meta.ayat - 1);

  const recordAyah = (attempts: CharAttempt[]) => {
    let progress = profile.progress;
    for (const attempt of attempts) {
      progress = recordAttempt(progress, attempt.char, attempt.correct);
    }
    progress = advance(progress);
    const correct = attempts.filter((attempt) => attempt.correct).length;
    const accuracy = attempts.length === 0 ? 1 : correct / attempts.length;
    setAyahAccuracy(accuracy);
    const nextIndex = ayahIndex + 1;
    const done = nextIndex >= meta.ayat;
    const entry: SurahProgress = {
      ayah: done ? meta.ayat - 1 : nextIndex,
      done: saved.done || done,
      star: (saved.star || done) && (saved.star || accuracy >= 0.95),
      bestAccuracy: Math.max(saved.bestAccuracy, accuracy),
    };
    onProfile({ ...profile, progress, recitation: { ...profile.recitation, [String(surah)]: entry } });
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  };

  return (
    <SurahTyping
      meta={meta}
      ayahText={stripToTier(surahAyat[ayahIndex] ?? "", tier)}
      ayahNumber={ayahIndex + 1}
      tier={tier}
      completed={saved.done}
      starred={saved.star}
      playing={playing}
      attemptsRef={attemptsRef}
      onPlay={() => {
        if (audioRef.current === null) {
          audioRef.current = new Audio(audioUrl(surah, ayahIndex + 1));
          audioRef.current.onended = () => setPlaying(false);
        }
        if (playing) {
          audioRef.current.pause();
          setPlaying(false);
        } else {
          audioRef.current.play().catch(() => setPlaying(false));
          setPlaying(true);
        }
      }}
      onAyahDone={(attempts) => recordAyah(attempts)}
      onBack={onBack}
      onRestart={() => setConfirmRestart(true)}
      confirmRestart={confirmRestart}
      onCancelRestart={() => setConfirmRestart(false)}
      onConfirmRestart={() => {
        setConfirmRestart(false);
        setAyahAccuracy(null);
        attemptsRef.current = [];
        onProfile({
          ...profile,
          recitation: {
            ...profile.recitation,
            [String(surah)]: { ayah: 0, done: false, star: false, bestAccuracy: 0 },
          },
        });
      }}
      ayahAccuracy={ayahAccuracy}
    />
  );
}

interface SurahTypingProps {
  meta: SurahMeta;
  ayahText: string;
  ayahNumber: number;
  tier: "none" | "core" | "full";
  completed: boolean;
  starred: boolean;
  playing: boolean;
  attemptsRef: { current: CharAttempt[] };
  onPlay: () => void;
  onAyahDone: (attempts: CharAttempt[]) => void;
  onBack: () => void;
  onRestart: () => void;
  confirmRestart: boolean;
  onCancelRestart: () => void;
  onConfirmRestart: () => void;
  ayahAccuracy: number | null;
}

function SurahTyping(props: SurahTypingProps) {
  const { meta, ayahText, ayahNumber, tier, completed } = props;
  const lines = useMemo(() => linesOf(ayahText, 30), [ayahText]);
  const [lineIndex, setLineIndex] = useState(0);
  const index = Math.min(lineIndex, Math.max(lines.length - 1, 0));
  const line = lines[index] ?? "";
  const attemptsRef = props.attemptsRef;
  const { state, handleKeyDown } = useTyping(line, (finished) => {
    attemptsRef.current = [...attemptsRef.current, ...finished.attempts];
    if (index + 1 < lines.length) {
      setLineIndex(index + 1);
    } else {
      const attempts = attemptsRef.current;
      attemptsRef.current = [];
      setLineIndex(0);
      props.onAyahDone(attempts);
    }
  });

  useEffect(() => {
    setLineIndex(0);
    attemptsRef.current = [];
  }, [ayahNumber, attemptsRef]);

  if (completed && lineIndex === 0 && state.typed === "") {
    return (
      <section
        aria-labelledby="surah-heading"
        className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-10"
      >
        <h1 id="surah-heading" className="text-xl font-semibold">
          {meta.tname} {props.starred ? "✓★" : "✓"}
        </h1>
        <p lang="ar" className="text-lg">
          {meta.name}
        </p>
        <p className="text-stone-600 dark:text-stone-300">
          Surah complete. Best accuracy: {Math.round((props.ayahAccuracy ?? 1) * 100)}%.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={props.onBack}
            className="rounded-lg border border-stone-300 px-4 py-2 hover:border-stone-400 dark:border-stone-700"
          >
            Back to surahs
          </button>
          <button
            type="button"
            onClick={props.onRestart}
            className="rounded-lg border border-red-700 px-4 py-2 text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          >
            Type again…
          </button>
        </div>
        {props.confirmRestart ? (
          <Confirm
            title="Type this surah again?"
            body="Your ✓ and ★ for this surah, and its saved position, are set back to the start. This cannot be undone."
            confirmLabel="Start over"
            onConfirm={props.onConfirmRestart}
            onCancel={props.onCancelRestart}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section aria-labelledby="surah-heading" className="mx-auto flex max-w-3xl flex-col gap-6 px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="surah-heading" className="text-xl font-semibold">
          <button
            type="button"
            onClick={props.onBack}
            className="me-2 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            aria-label="Back to surah list"
          >
            ←
          </button>
          {meta.tname}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Ayah {ayahNumber} of {meta.ayat} · line {index + 1} of {lines.length} · harakat: {tier}
        </p>
      </div>
      <TypingArea target={line} typed={state.typed} wrong={state.wrong} onKeyDown={handleKeyDown} />
      <Keyboard remaining={line.slice(state.typed.length)} wrong={state.wrong} />
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={props.onPlay}
          aria-label={props.playing ? "Pause the recitation" : "Play the recitation of this ayah"}
          className="rounded-lg border border-stone-300 px-4 py-2 hover:border-stone-400 dark:border-stone-700"
        >
          {props.playing ? "⏸ Pause" : "▶ Play"}
        </button>
        <p role="status" aria-live="polite" className="min-h-6 text-sm text-stone-600 dark:text-stone-300">
          {state.done
            ? "Line complete."
            : props.ayahAccuracy === null
              ? "Click the text, then type."
              : `Last ayah: ${Math.round(props.ayahAccuracy * 100)}% accuracy.`}
        </p>
      </div>
    </section>
  );
}
