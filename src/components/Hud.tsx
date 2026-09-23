import { formatNumber, formatPercent, formatSeconds } from "~/engine/format.ts";
import type { SessionMetrics } from "~/engine/session/session.ts";

export interface HudProps {
  metrics: SessionMetrics;
}

export default function Hud({ metrics }: HudProps) {
  const items: { label: string; value: string; cy: string }[] = [
    { label: "cpm", value: formatNumber(metrics.cpm), cy: "cpm" },
    { label: "wpm", value: formatNumber(metrics.wpm), cy: "wpm" },
    { label: "acc", value: formatPercent(metrics.accuracy), cy: "accuracy" },
    { label: "err", value: String(metrics.errors), cy: "errors" },
    { label: "time", value: formatSeconds(metrics.elapsedMs), cy: "elapsed" },
  ];

  return (
    <dl data-cy="hud" className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-xs tabular-nums">
      {items.map((item) => (
        <div key={item.cy} className="flex flex-row-reverse items-baseline gap-1.5">
          <dt className="uppercase tracking-wider text-stone-400">{item.label}</dt>
          <dd data-cy={`hud-${item.cy}`} className="text-sm text-stone-700 dark:text-stone-300">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
