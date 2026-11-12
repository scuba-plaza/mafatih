import { type PointerEvent, type ReactNode, useEffect, useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Settings } from "~/settings/settings.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { Switch } from "~/ui/Switch.tsx";
import { requireSurahMeta, surahName } from "../quran.ts";
import { reciterOf } from "./reciters.ts";
import type { Player as PlayerHandle } from "./usePlayer.ts";

const ICON_BUTTON = "flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3";
const SECONDARY = `${ICON_BUTTON} border-line bg-surface`;
const PRIMARY = `${ICON_BUTTON} border-accent bg-accent text-on-accent`;

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
      {children}
    </svg>
  );
}

function finePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

export interface PlayerProps {
  readonly player: PlayerHandle;
  readonly settings: Settings;
  readonly surah: number;
  readonly refocus: () => void;
}

export function Player({ player, settings, surah, refocus }: PlayerProps) {
  const { t, language, formatPercent } = useI18n();
  const { update } = useProfile();
  const volumeId = useId();
  const reciter = reciterOf(settings.reciter);
  const { clip, state } = player;
  const playing = state.status === "playing";
  const meta = requireSurahMeta(surah);

  const change = (patch: Partial<Settings>) =>
    update((current) => ({ ...current, settings: { ...current.settings, ...patch } }));

  const afterPointer = (event: PointerEvent) => {
    if (event.pointerType !== "touch" && finePointer()) {
      refocus();
    }
  };

  const reciterName = language === "ar" ? reciter.nameAr : reciter.name;
  const reciterStyle = language === "ar" ? reciter.styleAr : reciter.style;
  const line =
    state.status === "failed"
      ? t("player.unavailable")
      : clip === undefined
        ? ""
        : t(player.onBasmala ? "player.nowBasmala" : "player.now", {
            reciter: reciterName,
            style: reciterStyle,
            kbps: reciter.kbps,
            surah: clip.surah,
            ayah: clip.ayah,
          });

  const title =
    clip === undefined
      ? ""
      : player.onBasmala
        ? t("player.basmala")
        : `${surahName(requireSurahMeta(clip.surah), language)} ${clip.ayah}`;
  const album = surahName(meta, language);
  const { play, pause, next, previous, toggle } = player;
  const mediaSession = "mediaSession" in navigator ? navigator.mediaSession : null;

  useEffect(() => {
    if (mediaSession !== null && clip !== undefined) {
      mediaSession.metadata = new MediaMetadata({ title, artist: reciterName, album });
    }
  }, [mediaSession, clip, title, reciterName, album]);

  useEffect(() => {
    if (mediaSession === null) {
      return;
    }
    mediaSession.setActionHandler("play", play);
    mediaSession.setActionHandler("pause", pause);
    mediaSession.setActionHandler("previoustrack", previous);
    mediaSession.setActionHandler("nexttrack", next);
    return () => {
      for (const action of ["play", "pause", "previoustrack", "nexttrack"] as const) {
        mediaSession.setActionHandler(action, null);
      }
    };
  }, [mediaSession, play, pause, previous, next]);

  useEffect(
    () => () => {
      if (mediaSession !== null) {
        mediaSession.metadata = null;
      }
    },
    [mediaSession],
  );

  return (
    <fieldset
      onPointerUp={afterPointer}
      className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-surface p-3"
    >
      <legend className="sr-only">{t("player.label")}</legend>
      <div dir="ltr" className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={previous} className={SECONDARY}>
          <Icon>
            <path d="M6 5h2v14H6zM20 5v14L9 12z" />
          </Icon>
          <span className="sr-only">{t("player.previous")}</span>
        </button>
        <button type="button" onClick={toggle} className={PRIMARY}>
          <Icon>{playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M7 4v16l13-8z" />}</Icon>
          <span className="sr-only">{t(playing ? "player.pause" : "player.play")}</span>
        </button>
        <button type="button" onClick={next} className={SECONDARY}>
          <Icon>
            <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
          </Icon>
          <span className="sr-only">{t("player.next")}</span>
        </button>
        <button
          type="button"
          aria-pressed={settings.muted}
          onClick={() => change({ muted: !settings.muted })}
          className={`${SECONDARY} aria-pressed:border-ink aria-pressed:bg-page`}
        >
          <Icon>
            {settings.muted ? (
              <path d="M3 9v6h4l5 4V5L7 9zM16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" />
            ) : (
              <path d="M3 9v6h4l5 4V5L7 9zM15 8a5 5 0 0 1 0 8" />
            )}
          </Icon>
          <span className="sr-only">{t("player.mute")}</span>
        </button>
        <label htmlFor={volumeId} className="sr-only">
          {t("player.volume")}
        </label>
        <input
          id={volumeId}
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(settings.volume * 100)}
          aria-valuetext={formatPercent(settings.volume)}
          onChange={(event) => change({ volume: Number(event.target.value) / 100 })}
          className="h-11 min-w-24 flex-1 accent-accent"
        />
      </div>
      <Switch label={t("player.whole")} checked={settings.playWhole} onChange={(playWhole) => change({ playWhole })} />
      <p role="status" className="min-h-10 text-sm text-muted">
        {line}
      </p>
    </fieldset>
  );
}
