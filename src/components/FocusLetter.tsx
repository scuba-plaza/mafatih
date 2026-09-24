import { letterOrder } from "~/engine/corpus/corpus.ts";
import { formatPercent } from "~/engine/format.ts";
import { isMastered, type KeyStats, recentAccuracyOf, statFor } from "~/engine/stats/keystats.ts";
import { DEFAULT_UNLOCK_CONFIG, focusLetter, type Progress } from "~/engine/stats/unlock.ts";

export interface FocusLetterProps {
  progress: Progress;
  stats: KeyStats;
}

const { minSamples, targetMs, minAccuracy } = DEFAULT_UNLOCK_CONFIG;

export default function FocusLetter({ progress, stats }: FocusLetterProps) {
  const focus = focusLetter(progress);
  if (focus === undefined || progress.unlockedCount >= letterOrder.length) {
    return null;
  }
  const stat = statFor(stats, focus);
  const accuracy = recentAccuracyOf(stat);
  const ms = Math.round(stat.meanMs);
  const ready = isMastered(stat, minSamples, targetMs, minAccuracy);
  const hint = `The next letter unlocks once ${focus} holds ${formatPercent(minAccuracy)} recent accuracy at ${targetMs} ms or faster over at least ${minSamples} keystrokes.`;

  return (
    <span
      data-cy="focus-letter"
      data-char={focus}
      data-accuracy={accuracy.toFixed(3)}
      data-ms={ms}
      data-samples={stat.samples}
      data-ready={ready}
      title={hint}
      className="flex items-baseline gap-1.5"
    >
      <span lang="ar" className="font-arabic text-base leading-none text-stone-700 dark:text-stone-300">
        {focus}
      </span>
      <span className={accuracy >= minAccuracy ? "text-stone-500" : "text-amber-600 dark:text-amber-400"}>
        {stat.samples === 0 ? "–" : formatPercent(accuracy)}
      </span>
      <span className={ms > 0 && ms <= targetMs ? "text-stone-500" : "text-amber-600 dark:text-amber-400"}>
        {stat.samples === 0 ? "" : `${ms} ms`}
      </span>
    </span>
  );
}
