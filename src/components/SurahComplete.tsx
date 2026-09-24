import { type CSSProperties, useEffect, useRef } from "react";
import { surahByNumber, surahs } from "~/engine/corpus/corpus.ts";
import { formatNumber, formatPercent } from "~/engine/format.ts";
import type { SurahCompletion } from "~/engine/recitation/recitation.ts";
import { useLatest } from "~/hooks/useLatest.ts";

export interface SurahCompleteProps {
  completion: SurahCompletion | null;
  completedSurahs: number;
  onContinue: () => void;
  onReplay: () => void;
}

const RAYS = 18;

const RAY_TONES = ["bg-amber-400", "bg-emerald-400", "bg-sky-400", "bg-rose-400"];

function duration(ms: number): string {
  const seconds = Math.round(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  return minutes === 0 ? `${seconds}s` : `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`;
}

function ordinal(n: number): string {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
}

function Figure({ label, value, cy }: { label: string; value: string; cy: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span data-cy={cy} className="font-mono text-xl tabular-nums text-stone-800 dark:text-stone-200">
        {value}
      </span>
      <span className="text-[0.6rem] uppercase tracking-[0.15em] text-stone-400">{label}</span>
    </div>
  );
}

export default function SurahComplete({ completion, completedSurahs, onContinue, onReplay }: SurahCompleteProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const openRef = useLatest(completion !== null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (completion !== null && !dialog.open) {
      dialog.showModal();
      continueRef.current?.focus();
    }
    if (completion === null && dialog.open) {
      dialog.close();
    }
  }, [completion]);

  const surah = completion === null ? undefined : surahByNumber(completion.surah);
  const next = completion === null ? undefined : surahByNumber(completion.next);

  return (
    <dialog
      ref={ref}
      data-cy="surah-complete-dialog"
      aria-label="Surah complete"
      onClose={() => {
        if (openRef.current) {
          onContinue();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onContinue();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onContinue();
        }
      }}
      className="m-auto w-[min(26rem,calc(100vw-2rem))] overflow-visible rounded-3xl bg-white p-0 text-stone-900 shadow-2xl ring-1 ring-stone-200 backdrop:bg-stone-950/50 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-800"
    >
      {completion === null || surah === undefined ? null : (
        <div
          data-cy="surah-complete"
          data-surah={completion.surah}
          data-next={completion.next}
          data-completions={completion.completions}
          data-starred={completion.starred}
          className="surah-complete-card relative flex flex-col items-center gap-5 px-6 pt-10 pb-6 text-center"
        >
          <div aria-hidden="true" className="pointer-events-none absolute top-16 left-1/2">
            {Array.from({ length: RAYS }, (_, i) => (
              <span
                key={i}
                className={`burst-ray absolute h-3 w-1.5 rounded-full ${RAY_TONES[i % RAY_TONES.length]}`}
                style={{ "--angle": `${(360 / RAYS) * i}deg`, "--delay": `${(i % 3) * 60}ms` } as CSSProperties}
              />
            ))}
          </div>

          <span
            lang="ar"
            className="surah-complete-name relative font-arabic text-5xl leading-tight text-stone-900 dark:text-stone-50"
          >
            {surah.name}
          </span>

          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold tracking-wide text-stone-700 dark:text-stone-200">
              {`${surah.tname} complete`}
            </h2>
            <p data-cy="surah-complete-note" className="text-xs text-stone-400">
              {completion.completions === 1
                ? `${surah.ename}. Every ayah typed, well done.`
                : `Typed through for the ${ordinal(completion.completions)} time.`}
            </p>
          </div>

          <div className="grid w-full grid-cols-4 gap-2 border-y border-stone-200/70 py-4 dark:border-stone-800/80">
            <Figure label="ayat" value={String(completion.ayat)} cy="surah-complete-ayat" />
            <Figure label="acc" value={formatPercent(completion.accuracy)} cy="surah-complete-accuracy" />
            <Figure label="cpm" value={formatNumber(completion.cpm)} cy="surah-complete-cpm" />
            <Figure label="time" value={duration(completion.elapsedMs)} cy="surah-complete-time" />
          </div>

          <p className="flex items-center gap-2 text-xs text-stone-500">
            {completion.starred ? (
              <span data-cy="surah-complete-star" className="text-base text-amber-500" title="95% accuracy or better">
                ★
              </span>
            ) : null}
            <span data-cy="surah-complete-count">{`${completedSurahs} of ${surahs.length} surahs complete`}</span>
          </p>

          <div className="flex w-full flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              data-cy="surah-complete-replay"
              onClick={onReplay}
              className="rounded-full px-4 py-2 text-xs text-stone-500 ring-1 ring-stone-200 hover:bg-stone-100 hover:text-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-100"
            >
              Type it again
            </button>
            <button
              type="button"
              ref={continueRef}
              data-cy="surah-complete-next"
              onClick={onContinue}
              className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              {next === undefined ? "Continue" : `Continue to ${next.tname} →`}
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
