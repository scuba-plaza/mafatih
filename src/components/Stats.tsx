import { letterOrder } from "~/engine/corpus/corpus.ts";
import { TIERS, type Tier } from "~/engine/corpus/normalize.ts";
import { formatNumber, formatPercent } from "~/engine/format.ts";
import { isHaraka } from "~/engine/layout/ara.ts";
import { attemptsOf, type KeyStats, recentAccuracyOf, statFor } from "~/engine/stats/keystats.ts";
import { type Progress, tierChars } from "~/engine/stats/unlock.ts";
import type { SessionSummary } from "~/storage/profile.ts";

export interface StatsProps {
  progress: Progress;
  stats: KeyStats;
  history: readonly SessionSummary[];
  effectiveTier: Tier;
}

const DOTTED_CIRCLE = "◌";

const TIER_LABEL: Record<Tier, string> = {
  none: "letters only",
  core: "+ fatha damma kasra sukun shadda",
  full: "+ tanween",
};

function Tile({ label, value, hint, cy }: { label: string; value: string; hint?: string; cy: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[0.6rem] uppercase tracking-[0.15em] text-stone-400">{label}</span>
      <span data-cy={cy} className="font-mono text-2xl tabular-nums text-stone-800 dark:text-stone-200">
        {value}
      </span>
      {hint === undefined ? null : <span className="text-[0.65rem] text-stone-400">{hint}</span>}
    </div>
  );
}

function Bar({ char, stats }: { char: string; stats: KeyStats }) {
  const stat = statFor(stats, char);
  const attempts = attemptsOf(stat);
  const accuracy = recentAccuracyOf(stat);
  const pct = attempts === 0 ? 0 : Math.round(accuracy * 100);
  const tone =
    attempts === 0
      ? "bg-stone-200 dark:bg-stone-800"
      : accuracy >= 0.95
        ? "bg-stone-800 dark:bg-stone-200"
        : accuracy >= 0.8
          ? "bg-amber-500"
          : "bg-red-500";

  return (
    <div data-cy="letter-stat" data-char={char} data-attempts={attempts} className="flex flex-col items-center gap-1">
      <div className="flex h-14 w-5 items-end overflow-hidden rounded-sm bg-stone-100 dark:bg-stone-900">
        <div className={`w-full ${tone}`} style={{ height: `${Math.max(pct, attempts === 0 ? 0 : 6)}%` }} />
      </div>
      <span lang="ar" className="font-arabic text-lg leading-none text-stone-700 dark:text-stone-300">
        {isHaraka(char) ? `${DOTTED_CIRCLE}${char}` : char}
      </span>
      <span className="font-mono text-[0.6rem] text-stone-400">
        {attempts === 0 ? "–" : `${Math.round(stat.meanMs)}`}
      </span>
    </div>
  );
}

function when(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Stats({ progress, stats, history, effectiveTier }: StatsProps) {
  const marks = TIERS.slice(1, TIERS.indexOf(effectiveTier) + 1).flatMap(tierChars);
  const tracked = [...letterOrder.slice(0, progress.unlockedCount), ...marks];
  const recent = [...history].reverse();
  const best = history.reduce((max, entry) => Math.max(max, entry.cpm), 0);
  const lastTen = recent.slice(0, 10);
  const meanAccuracy =
    lastTen.length === 0 ? 0 : lastTen.reduce((sum, entry) => sum + entry.accuracy, 0) / lastTen.length;

  return (
    <section data-cy="stats" className="flex flex-col gap-10">
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        <Tile
          label="Letters"
          cy="stats-letters"
          value={`${progress.unlockedCount}/${letterOrder.length}`}
          hint="unlocked"
        />
        <Tile label="Tier" cy="stats-tier" value={effectiveTier} hint={TIER_LABEL[effectiveTier]} />
        <Tile label="Lessons" cy="stats-sessions" value={String(history.length)} hint="completed" />
        <Tile label="Best" cy="stats-best-cpm" value={formatNumber(best)} hint="cpm" />
        <Tile label="Accuracy" cy="stats-accuracy" value={formatPercent(meanAccuracy)} hint="last ten lessons" />
      </div>

      <div data-cy="progress" className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Per character</h2>
        <div className="flex flex-wrap gap-2">
          {tracked.map((char) => (
            <Bar key={char} char={char} stats={stats} />
          ))}
        </div>
        <p className="text-[0.65rem] text-stone-400">
          Bar height is recent accuracy, roughly your last forty keystrokes of that character, so old mistakes fade; the
          number below each character is mean latency in ms. Statistics are kept per character, so a haraka scores
          separately from the letter sharing its key.
        </p>
      </div>

      <div data-cy="history" className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">Recent lessons</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-stone-400">No lessons finished yet.</p>
        ) : (
          <table className="w-full max-w-xl text-left font-mono text-xs tabular-nums text-stone-500">
            <thead className="text-[0.6rem] uppercase tracking-[0.15em] text-stone-400">
              <tr>
                <th className="py-1 font-normal">When</th>
                <th className="py-1 text-right font-normal">cpm</th>
                <th className="py-1 text-right font-normal">acc</th>
                <th className="py-1 text-right font-normal">err</th>
                <th className="py-1 text-right font-normal">chars</th>
                <th className="py-1 text-right font-normal">tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/70 dark:divide-stone-800/80">
              {lastTen.map((entry) => (
                <tr key={entry.at} data-cy="history-row">
                  <td className="py-1.5">{when(entry.at)}</td>
                  <td className="py-1.5 text-right text-stone-700 dark:text-stone-300">{formatNumber(entry.cpm)}</td>
                  <td className="py-1.5 text-right">{formatPercent(entry.accuracy)}</td>
                  <td className="py-1.5 text-right">{entry.errors}</td>
                  <td className="py-1.5 text-right">{entry.chars}</td>
                  <td className="py-1.5 text-right">{entry.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
