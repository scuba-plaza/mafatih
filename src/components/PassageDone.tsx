import { useEffect, useRef } from "react";
import { blurAfter, PRIMARY_BUTTON, scrollBehavior } from "~/components/ui.ts";
import { surahByNumber } from "~/engine/corpus/corpus.ts";
import { ayahRange, type LessonSource } from "~/engine/lessons/lesson.ts";

export interface PassageDoneProps {
  source: LessonSource;
  surahComplete: boolean;
  onRedo: () => void;
  onNext: () => void;
}

export default function PassageDone({ source, surahComplete, onRedo, onNext }: PassageDoneProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "nearest", behavior: scrollBehavior() });
  }, []);

  const surah = source.surah === undefined ? undefined : surahByNumber(source.surah);
  if (surah === undefined) {
    return null;
  }

  return (
    <div
      ref={ref}
      data-cy="passage-done"
      role="status"
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-2xl bg-emerald-500/10 px-4 py-3 ring-1 ring-emerald-500/30"
    >
      <p className="flex items-baseline gap-2 text-sm text-emerald-800 dark:text-emerald-200">
        <span aria-hidden="true" className="text-base">
          ✓
        </span>
        <span>
          <span className="font-semibold">{`Already typed · ${surah.tname} ${surah.n}:${ayahRange(source)}`}</span>
          <span data-cy="passage-done-note" className="block text-xs text-emerald-700/80 dark:text-emerald-300/80">
            {surahComplete
              ? "This surah is complete. Type the passage again, or move on."
              : "Type the passage again, or move on to the next one."}
          </span>
        </span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          data-cy="passage-redo"
          onClick={blurAfter(onRedo)}
          className="rounded-full px-4 py-1.5 text-xs text-emerald-800 ring-1 ring-emerald-600/40 hover:bg-emerald-500/15 dark:text-emerald-200"
        >
          Type it again
        </button>
        <button
          type="button"
          data-cy="passage-done-next"
          onClick={blurAfter(onNext)}
          className={`${PRIMARY_BUTTON} py-1.5`}
        >
          Next passage →
        </button>
      </div>
    </div>
  );
}
