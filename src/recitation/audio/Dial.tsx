import { type MouseEvent, type PointerEvent, useSyncExternalStore } from "react";
import { RING_LENGTH, RING_RADIUS, ringArcs } from "./dial.ts";
import { PauseIcon, PlayIcon } from "./icons.tsx";
import type { ClipProgress } from "./usePlayer.ts";

const CENTER = 50;
const STROKE = 4.5;

export interface DialProps {
  readonly weights: readonly number[];
  readonly current: number | null;
  readonly progress: ClipProgress;
  readonly playing: boolean;
  readonly label: string;
  readonly onToggle: () => void;
  readonly onMouseDown: (event: MouseEvent) => void;
  readonly onPointerUp: (event: PointerEvent) => void;
}

function Arc({
  start,
  length,
  className,
  glow = false,
}: {
  start: number;
  length: number;
  className: string;
  glow?: boolean;
}) {
  return (
    <circle
      cx={CENTER}
      cy={CENTER}
      r={RING_RADIUS}
      fill="none"
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeDasharray={`${Math.max(length, 0.01)} ${RING_LENGTH}`}
      transform={`rotate(${-90 + (start / RING_LENGTH) * 360} ${CENTER} ${CENTER})`}
      className={`${className}${glow ? " [filter:drop-shadow(0_0_4px_color-mix(in_srgb,var(--color-accent)_80%,transparent))]" : ""}`}
    />
  );
}

export function Dial({ weights, current, progress, playing, label, onToggle, onMouseDown, onPointerUp }: DialProps) {
  const fraction = useSyncExternalStore(progress.subscribe, progress.read);
  const arcs = ringArcs(weights);
  return (
    <div data-dial="" data-fraction={fraction.toFixed(2)} className="relative size-21 shrink-0 md:size-19">
      <svg aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-0 size-full">
        {arcs.map((arc, index) => (
          <g key={arc.start}>
            <Arc start={arc.start} length={arc.length} className="stroke-edge/50 forced-colors:stroke-[GrayText]" />
            {current !== null && index < current && (
              <Arc start={arc.start} length={arc.length} className="stroke-muted forced-colors:stroke-[Highlight]" />
            )}
            {current === index && fraction > 0 && (
              <Arc
                start={arc.start}
                length={arc.length * Math.min(fraction, 1)}
                className="stroke-accent forced-colors:stroke-[Highlight]"
                glow
              />
            )}
          </g>
        ))}
      </svg>
      <button
        type="button"
        onClick={onToggle}
        onMouseDown={onMouseDown}
        onPointerUp={onPointerUp}
        className={`absolute inset-0 grid place-items-center rounded-full ${playing ? "text-accent" : "text-ink"}`}
      >
        {playing ? <PauseIcon /> : <PlayIcon />}
        <span className="sr-only">{label}</span>
      </button>
    </div>
  );
}
