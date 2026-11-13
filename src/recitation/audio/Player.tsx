import { type MouseEvent, type PointerEvent, useEffect, useMemo } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import type { Settings } from "~/settings/settings.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import type { Passage } from "../passage.ts";
import { requireSurahMeta, surahName } from "../quran.ts";
import { AudioPanel } from "./AudioPanel.tsx";
import { Dial } from "./Dial.tsx";
import { stopWeights } from "./dial.ts";
import { NextIcon, PreviousIcon, RepeatIcon } from "./icons.tsx";
import { reciterOf } from "./reciters.ts";
import { ICON_BUTTON, LATCHED } from "./styles.ts";
import type { Player as PlayerHandle } from "./usePlayer.ts";

function keepFocus(event: MouseEvent): void {
  event.preventDefault();
}

function finePointer(): boolean {
  return window.matchMedia("(pointer: fine)").matches;
}

export interface PlayerProps {
  readonly player: PlayerHandle;
  readonly passage: Passage;
  readonly settings: Settings;
  readonly refocus: () => void;
}

export function Player({ player, passage, settings, refocus }: PlayerProps) {
  const { t, language } = useI18n();
  const { update } = useProfile();
  const reciter = reciterOf(settings.reciter);
  const { clip, state } = player;
  const playing = state.status === "playing";
  const weights = useMemo(() => stopWeights(passage), [passage]);
  const meta = requireSurahMeta(passage.surah);

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
    <fieldset className="flex min-w-0 flex-col items-center">
      <legend className="sr-only">{t("player.label")}</legend>
      <div dir="ltr" className="flex flex-wrap items-center justify-center gap-1">
        <button
          type="button"
          aria-pressed={settings.loop}
          onClick={() => change({ loop: !settings.loop })}
          onMouseDown={keepFocus}
          onPointerUp={afterPointer}
          className={`${ICON_BUTTON} ${LATCHED}`}
        >
          <RepeatIcon />
          <span className="sr-only">{t(settings.playWhole ? "player.repeat" : "player.repeatAyah")}</span>
        </button>
        <button
          type="button"
          onClick={previous}
          onMouseDown={keepFocus}
          onPointerUp={afterPointer}
          className={ICON_BUTTON}
        >
          <PreviousIcon />
          <span className="sr-only">{t("player.previous")}</span>
        </button>
        <Dial
          weights={weights}
          current={state.status === "idle" ? null : state.index}
          progress={player.progress}
          playing={playing}
          label={t(playing ? "player.pause" : "player.play")}
          onToggle={toggle}
          onMouseDown={keepFocus}
          onPointerUp={afterPointer}
        />
        <button type="button" onClick={next} onMouseDown={keepFocus} onPointerUp={afterPointer} className={ICON_BUTTON}>
          <NextIcon />
          <span className="sr-only">{t("player.next")}</span>
        </button>
        <AudioPanel settings={settings} reciter={reciter} change={change} />
      </div>
      <p role="status" className="sr-only">
        {line}
      </p>
    </fieldset>
  );
}
