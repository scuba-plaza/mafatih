import FocusLetter from "~/components/FocusLetter.tsx";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import type { Tier } from "~/engine/corpus/normalize.ts";
import type { KeyStats } from "~/engine/stats/keystats.ts";
import type { Progress } from "~/engine/stats/unlock.ts";
import { hrefOf, PAGE_ROUTE, type Page } from "~/hooks/useRoute.ts";

export interface HeaderProps {
  page: Page;
  progress: Progress;
  stats: KeyStats;
  tier: Tier;
  onOpenSettings: () => void;
}

const NAV = "text-xs transition-colors";
const NAV_ON = "text-stone-900 dark:text-stone-100";
const NAV_OFF = "text-stone-400 hover:text-stone-900 dark:hover:text-stone-100";

function NavLink({ target, current, label }: { target: Page; current: Page; label: string }) {
  return (
    <a
      data-cy={`nav-${target}`}
      href={hrefOf(PAGE_ROUTE[target])}
      aria-current={target === current ? "page" : undefined}
      className={`${NAV} ${target === current ? NAV_ON : NAV_OFF}`}
    >
      {label}
    </a>
  );
}

export default function Header({ page, progress, stats, tier, onOpenSettings }: HeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <a href={hrefOf(PAGE_ROUTE.practice)} className="flex items-baseline gap-2" aria-label="Mafatih">
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
        <NavLink target="practice" current={page} label="Practice" />
        <NavLink target="recitation" current={page} label="Recitation" />
        <NavLink target="custom" current={page} label="Custom" />
        <NavLink target="stats" current={page} label="Stats" />
        <button type="button" data-cy="open-settings" onClick={onOpenSettings} className={`${NAV} ${NAV_OFF}`}>
          Settings
        </button>
      </nav>
    </header>
  );
}
