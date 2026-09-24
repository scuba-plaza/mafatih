import { blur, blurAfter } from "~/components/ui.ts";
import type { RecitationPlayer } from "~/hooks/useRecitationPlayer.ts";

export interface RecitationBarProps {
  player: RecitationPlayer;
}

const BAR =
  "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2 ring-1 ring-stone-200 dark:ring-stone-800";
const BUTTON =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-stone-800 dark:hover:text-stone-100";
const PLAY = `${BUTTON} bg-stone-900 text-stone-50 hover:bg-stone-700 hover:text-stone-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 dark:hover:text-stone-900`;
const TOGGLED = `${BUTTON} bg-sky-500/15 text-sky-700 hover:bg-sky-500/20 hover:text-sky-700 dark:text-sky-300 dark:hover:bg-sky-500/20 dark:hover:text-sky-300`;
const LABEL =
  "order-3 flex w-full min-w-0 items-baseline overflow-hidden font-mono text-xs tabular-nums text-stone-400 sm:order-2 sm:w-auto sm:flex-1";
const SLIDER = "h-1 cursor-pointer appearance-none rounded-full bg-stone-200 accent-sky-600 dark:bg-stone-800";

const PATHS = {
  play: "M8 5.14v13.72L19 12z",
  pause: "M7 5h3.5v14H7zm6.5 0H17v14h-3.5z",
  previous: "M7 6h2.5v12H7zm3.5 6 8 6V6z",
  next: "M17 6h-2.5v12H17zm-3.5 6-8 6V6z",
  loop: "M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z",
  volume: "M4 9v6h3.5L13 20V4L7.5 9zm12.5 3a4 4 0 0 0-2.5-3.7v7.4a4 4 0 0 0 2.5-3.7z",
  muted:
    "M4 9v6h3.5L13 20V4L7.5 9zm14.7 3 2.1-2.1-1.1-1.1L17.6 11l-2.1-2.1-1.1 1.1 2.1 2.1-2.1 2.1 1.1 1.1 2.1-2.1 2.1 2.1 1.1-1.1z",
};

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 fill-current">
      <path d={path} />
    </svg>
  );
}

export default function RecitationBar({ player }: RecitationBarProps) {
  const { ayah, basmala, reciter, surah, playing, loading, failed, muted, volume, loop, progress } = player;
  const idle = failed || ayah === undefined;

  const verse = ayah === undefined ? "" : ayah === null ? "bismillah" : `${surah}:${ayah}`;
  const playingWhat = `${reciter.style} ${reciter.kbps} kbps · ${verse}`;

  return (
    <div
      data-cy="recitation"
      data-playing={playing}
      data-loading={loading}
      data-failed={failed}
      data-loop={loop}
      data-ayah={ayah ?? (basmala ? "basmala" : "")}
      className={BAR}
    >
      <div className="order-1 flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-cy="recitation-previous"
          aria-label="Previous ayah"
          disabled={idle}
          onClick={blurAfter(player.previous)}
          className={BUTTON}
        >
          <Icon path={PATHS.previous} />
        </button>
        <button
          type="button"
          data-cy="recitation-toggle"
          aria-label={playing ? "Pause recitation" : "Play recitation"}
          disabled={idle}
          onClick={blurAfter(player.toggle)}
          className={PLAY}
        >
          <Icon path={playing ? PATHS.pause : PATHS.play} />
        </button>
        <button
          type="button"
          data-cy="recitation-next"
          aria-label="Next ayah"
          disabled={idle}
          onClick={blurAfter(player.next)}
          className={BUTTON}
        >
          <Icon path={PATHS.next} />
        </button>
        <button
          type="button"
          data-cy="recitation-loop"
          aria-label={loop ? "Stop repeating the passage" : "Repeat the passage"}
          aria-pressed={loop}
          onClick={blurAfter(player.toggleLoop)}
          className={loop ? TOGGLED : BUTTON}
        >
          <Icon path={PATHS.loop} />
        </button>
      </div>

      <div className="order-2 flex min-w-0 flex-1 items-center gap-1 sm:order-3 sm:flex-none">
        <button
          type="button"
          data-cy="recitation-mute"
          aria-label={muted ? "Unmute recitation" : "Mute recitation"}
          onClick={blurAfter(player.toggleMute)}
          className={BUTTON}
        >
          <Icon path={muted ? PATHS.muted : PATHS.volume} />
        </button>
        <input
          type="range"
          data-cy="recitation-volume"
          aria-label="Recitation volume"
          min={0}
          max={1}
          step={0.01}
          value={muted ? 0 : volume}
          disabled={muted}
          onChange={(event) => player.setVolume(Number(event.target.value))}
          onPointerUp={blurAfter(player.commitVolume)}
          onBlur={player.commitVolume}
          className={`${SLIDER} w-full sm:w-24`}
        />
      </div>

      <p
        data-cy="recitation-label"
        data-style={reciter.style}
        data-kbps={reciter.kbps}
        data-verse={verse}
        className={LABEL}
      >
        {failed ? (
          "Recitation unavailable"
        ) : (
          <>
            <span className="min-w-0 truncate">{`${reciter.name} · `}</span>
            <span className="shrink-0 whitespace-nowrap pl-1">{playingWhat}</span>
          </>
        )}
      </p>

      <input
        type="range"
        data-cy="recitation-seek"
        aria-label="Seek within the ayah"
        min={0}
        max={1}
        step={0.001}
        value={progress}
        disabled={idle}
        onChange={(event) => player.seek(Number(event.target.value))}
        onPointerUp={blur}
        className={`${SLIDER} order-4 w-full`}
      />
    </div>
  );
}
