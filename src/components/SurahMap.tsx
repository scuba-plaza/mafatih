import { FIELD } from "~/components/Modal.tsx";
import { surahByNumber, surahs } from "~/engine/corpus/corpus.ts";
import {
  completedSurahs,
  isSurahOrder,
  progressOf,
  type Recitation,
  type RecitationPosition,
  resumeOf,
  type SurahOrder,
  surahSequence,
} from "~/engine/recitation/recitation.ts";

export interface SurahMapProps {
  recitation: Recitation;
  order: SurahOrder;
  onOrder: (order: SurahOrder) => void;
  onPlay: (position: RecitationPosition) => void;
  onReset: () => void;
}

const RING_RADIUS = 15;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function Ring({ fraction, complete, current }: { fraction: number; complete: boolean; current: boolean }) {
  const tone = complete ? "stroke-emerald-500" : current ? "stroke-sky-500" : "stroke-stone-500 dark:stroke-stone-400";
  return (
    <svg viewBox="0 0 36 36" aria-hidden="true" className="absolute inset-0 size-full -rotate-90">
      <circle
        cx="18"
        cy="18"
        r={RING_RADIUS}
        className="fill-none stroke-stone-200 dark:stroke-stone-800"
        strokeWidth="2.5"
      />
      <circle
        cx="18"
        cy="18"
        r={RING_RADIUS}
        className={`fill-none transition-[stroke-dashoffset] duration-700 ${tone}`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - fraction)}
      />
    </svg>
  );
}

function Tile({
  surah,
  recitation,
  onPlay,
}: {
  surah: number;
  recitation: Recitation;
  onPlay: (position: RecitationPosition) => void;
}) {
  const meta = surahByNumber(surah);
  if (meta === undefined) {
    return null;
  }
  const progress = progressOf(recitation, surah);
  const current = recitation.position.surah === surah;
  const status = progress.complete
    ? progress.starred
      ? "complete with a star"
      : "complete"
    : `${progress.covered} of ${progress.total} ayat typed`;

  return (
    <button
      type="button"
      data-cy="surah-tile"
      data-surah={surah}
      data-covered={progress.covered}
      data-complete={progress.complete}
      data-starred={progress.starred}
      data-current={current}
      aria-label={`${meta.tname}, ${status}`}
      onClick={() => onPlay({ surah, ayah: resumeOf(recitation, surah) })}
      className={`group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left ring-1 transition-colors hover:bg-white dark:hover:bg-stone-900 ${
        current ? "bg-white ring-sky-500/60 dark:bg-stone-900" : "ring-stone-200 dark:ring-stone-800"
      }`}
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center">
        <Ring fraction={progress.fraction} complete={progress.complete} current={current} />
        <span className="font-mono text-xs tabular-nums text-stone-500">
          {progress.complete ? <span className="text-base text-emerald-600 dark:text-emerald-400">✓</span> : surah}
        </span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm text-stone-700 dark:text-stone-300">{meta.tname}</span>
          <span lang="ar" className="shrink-0 font-arabic text-base leading-none text-stone-500">
            {meta.name}
          </span>
        </span>
        <span className="flex items-center gap-1.5 font-mono text-[0.65rem] tabular-nums text-stone-400">
          {`${surah} · ${progress.covered}/${progress.total}`}
          {progress.starred ? <span className="text-amber-500">★</span> : null}
          {progress.completions > 1 ? <span>{`×${progress.completions}`}</span> : null}
        </span>
      </span>
    </button>
  );
}

export default function SurahMap({ recitation, order, onOrder, onPlay, onReset }: SurahMapProps) {
  const done = completedSurahs(recitation);
  const { surah, ayah } = recitation.position;
  const current = surahByNumber(surah);
  const typedAyat = surahs.reduce((sum, s) => sum + progressOf(recitation, s.n).covered, 0);
  const totalAyat = surahs.reduce((sum, s) => sum + s.ayatCount, 0);

  return (
    <section data-cy="recitation-page" className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Recitation</h1>
          <p className="max-w-md text-sm text-stone-500">
            Type the Qur'an surah by surah. Every surah is a level: finish its last ayah to complete it, and hold 95%
            accuracy to earn a star.
          </p>
        </div>
        <div className="flex gap-8 font-mono tabular-nums">
          <div className="flex flex-col">
            <span data-cy="recitation-surahs" className="text-2xl text-stone-800 dark:text-stone-200">
              {`${done}/${surahs.length}`}
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-stone-400">surahs</span>
          </div>
          <div className="flex flex-col">
            <span data-cy="recitation-ayat" className="text-2xl text-stone-800 dark:text-stone-200">
              {`${typedAyat}/${totalAyat}`}
            </span>
            <span className="text-[0.6rem] uppercase tracking-[0.15em] text-stone-400">ayat</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        {current === undefined ? null : (
          <button
            type="button"
            data-cy="recitation-continue"
            onClick={() => onPlay({ surah, ayah })}
            className="rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            {`Continue · ${current.tname} ${surah}:${ayah}`}
          </button>
        )}
        <label className="flex items-center gap-3 text-xs text-stone-400">
          Order
          <select
            data-cy="recitation-order"
            className={FIELD}
            value={order}
            onChange={(event) => {
              if (isSurahOrder(event.target.value)) {
                onOrder(event.target.value);
              }
            }}
          >
            <option value="mushaf">Mushaf</option>
            <option value="juz-amma">Juz ʿAmma first</option>
          </select>
        </label>
      </div>

      <div data-cy="surah-map" className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {surahSequence(order).map((n) => (
          <Tile key={n} surah={n} recitation={recitation} onPlay={onPlay} />
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          data-cy="reset-recitation"
          onClick={onReset}
          className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400"
        >
          Reset recitation progress
        </button>
      </div>
    </section>
  );
}
