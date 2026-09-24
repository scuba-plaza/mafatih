import type { KeyboardEvent, MouseEvent, SyntheticEvent } from "react";
import type { LessonSource } from "~/engine/lessons/lesson.ts";
import { type AyahRange, ayatCount, progressOf, type Recitation, recordOf } from "~/engine/recitation/recitation.ts";

export interface PassageBarProps {
  source: LessonSource;
  recitation: Recitation;
  onPrevious: () => void;
  onNext: () => void;
  onJump: (ayah: number) => void;
}

const BUTTON =
  "flex size-8 shrink-0 items-center justify-center rounded-full text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100";

const PATHS = {
  previous: "M15.4 7.4 14 6l-6 6 6 6 1.4-1.4-4.6-4.6z",
  next: "M8.6 16.6 10 18l6-6-6-6-1.4 1.4 4.6 4.6z",
};

function Chevron({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d={path} />
    </svg>
  );
}

function percent(ayat: number, total: number): string {
  return `${(ayat / total) * 100}%`;
}

function blurAfter(run: () => void) {
  return (event: SyntheticEvent<HTMLElement>) => {
    run();
    event.currentTarget.blur();
  };
}

export default function PassageBar({ source, recitation, onPrevious, onNext, onJump }: PassageBarProps) {
  const { surah, fromAyah, toAyah } = source;
  if (source.kind !== "recite" || surah === undefined || fromAyah === undefined || toAyah === undefined) {
    return null;
  }
  const total = ayatCount(surah);
  if (total === 0) {
    return null;
  }
  const progress = progressOf(recitation, surah);
  const typed: readonly AyahRange[] = progress.complete ? [[1, total]] : recordOf(recitation, surah).run.typed;

  const jumpTo = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const fraction = rect.width === 0 ? 0 : (event.clientX - rect.left) / rect.width;
    onJump(Math.min(total, Math.max(1, Math.ceil(fraction * total))));
    event.currentTarget.blur();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      onNext();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      onPrevious();
    }
  };

  return (
    <div
      data-cy="passage-bar"
      data-surah={surah}
      data-from={fromAyah}
      data-to={toAyah}
      data-total={total}
      data-covered={progress.covered}
      data-complete={progress.complete}
      data-starred={progress.starred}
      className="flex items-center gap-2"
    >
      <button
        type="button"
        data-cy="passage-previous"
        aria-label="Previous passage"
        title="Previous passage (Page Up)"
        onClick={blurAfter(onPrevious)}
        className={BUTTON}
      >
        <Chevron path={PATHS.previous} />
      </button>

      <div
        data-cy="passage-progress"
        role="slider"
        tabIndex={0}
        aria-label="Jump to an ayah"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={fromAyah}
        aria-valuetext={`Ayah ${fromAyah} of ${total}`}
        onClick={jumpTo}
        onKeyDown={onKeyDown}
        className="group relative h-4 flex-1 cursor-pointer outline-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-stone-200 transition-[height] group-hover:h-2 group-focus-visible:ring-2 group-focus-visible:ring-sky-500/50 dark:bg-stone-800">
          {typed.map(([start, end], index) => (
            <div
              key={index}
              data-cy="passage-typed"
              className={`absolute inset-y-0 transition-[left,width] duration-700 ease-out ${
                progress.complete ? "bg-emerald-500/70" : "bg-stone-400 dark:bg-stone-500"
              }`}
              style={{ left: percent(start - 1, total), width: percent(end - start + 1, total) }}
            />
          ))}
          <div
            data-cy="passage-current"
            className="absolute inset-y-0 rounded-full bg-sky-500 transition-[left,width] duration-500 ease-out"
            style={{ left: percent(fromAyah - 1, total), width: percent(toAyah - fromAyah + 1, total) }}
          />
        </div>
      </div>

      <span
        data-cy="passage-label"
        className="flex shrink-0 items-baseline gap-1.5 font-mono text-xs tabular-nums text-stone-400"
      >
        {`${progress.covered}/${total}`}
        {progress.complete ? (
          <span data-cy="passage-complete" title="Surah complete" className="text-emerald-600 dark:text-emerald-400">
            ✓
          </span>
        ) : null}
        {progress.starred ? (
          <span data-cy="passage-star" title="Completed at 95% accuracy or better" className="text-amber-500">
            ★
          </span>
        ) : null}
      </span>

      <button
        type="button"
        data-cy="passage-next"
        aria-label="Next passage"
        title="Next passage (Page Down)"
        onClick={blurAfter(onNext)}
        className={BUTTON}
      >
        <Chevron path={PATHS.next} />
      </button>
    </div>
  );
}
