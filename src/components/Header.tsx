import FocusLetter from "~/components/FocusLetter.tsx";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import type { Tier } from "~/engine/corpus/normalize.ts";
import type { KeyStats } from "~/engine/stats/keystats.ts";
import type { Progress } from "~/engine/stats/unlock.ts";
import { ROUTE_HASH, type Route } from "~/hooks/useRoute.ts";

export interface HeaderProps {
  route: Route;
  progress: Progress;
  stats: KeyStats;
  tier: Tier;
  onOpenSettings: () => void;
}

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

export default function Header({ route, progress, stats, tier, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <a href={ROUTE_HASH.practice} className="flex items-baseline gap-2" aria-label="Mafatih">
        <span lang="ar" className="font-arabic text-xl leading-none text-stone-900 dark:text-stone-100">
          مفاتيح
        </span>
      </a>
      <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
        <span data-cy="progress-summary" className="whitespace-nowrap font-mono text-xs tabular-nums text-stone-400">
          <span data-cy="unlocked-count">{progress.unlockedCount}</span>
          {`/${letterOrder.length} · `}
          <span data-cy="tier">{tier}</span>
        </span>
        <span className="hidden font-mono text-xs tabular-nums text-stone-400 sm:inline">
          <FocusLetter progress={progress} stats={stats} />
        </span>
        <NavLink target="practice" current={route} label="Practice" />
        <NavLink target="recitation" current={route} label="Recitation" />
        <NavLink target="stats" current={route} label="Stats" />
        <button type="button" data-cy="open-settings" onClick={onOpenSettings} className={`${NAV} ${NAV_OFF}`}>
          Settings
        </button>
      </nav>
    </header>
  );
}
