import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { Passage } from "../passage.ts";
import { loadAyahBlob, sharedAudioCache } from "./cache.ts";
import { initialPlayer, type PlayerState, playerReducer } from "./player.ts";
import { type AudioClip, audioSequence, ayahAudioUrl, type ReciterId } from "./reciters.ts";

export interface PlayerOptions {
  readonly passage: Passage | null;
  readonly reciter: ReciterId;
  readonly volume: number;
  readonly muted: boolean;
  readonly whole: boolean;
  readonly held: boolean;
  readonly resting: boolean;
}

export interface Player {
  readonly state: PlayerState;
  readonly clip: AudioClip | undefined;
  readonly onBasmala: boolean;
  readonly play: () => void;
  readonly pause: () => void;
  readonly toggle: () => void;
  readonly next: () => void;
  readonly previous: () => void;
}

interface Loaded {
  readonly url: string;
  readonly objectUrl: string;
}

export function usePlayer({ passage, reciter, volume, muted, whole, held, resting }: PlayerOptions): Player {
  const clips = useMemo(() => (passage === null ? [] : audioSequence(passage)), [passage]);
  const [state, dispatch] = useReducer(playerReducer, undefined, () => ({ ...initialPlayer(clips.length), whole }));
  const element = useRef<HTMLAudioElement | null>(null);
  const loaded = useRef<Loaded | null>(null);
  const ticket = useRef(0);
  const playingRef = useRef(false);
  const seenRestarts = useRef(0);

  const clip = clips[state.index];
  const url = clip === undefined ? undefined : ayahAudioUrl(reciter, clip.surah, clip.ayah);
  const nextClip = clips[state.index + 1];
  const nextUrl = nextClip === undefined ? undefined : ayahAudioUrl(reciter, nextClip.surah, nextClip.ayah);
  const playing = state.status === "playing";

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  const audio = useCallback((): HTMLAudioElement | null => {
    if (typeof Audio === "undefined") {
      return null;
    }
    if (element.current === null) {
      element.current = new Audio();
    }
    return element.current;
  }, []);

  useEffect(() => {
    if (passage !== null) {
      dispatch({ type: "load", count: clips.length });
    }
  }, [passage, clips.length]);

  useEffect(() => dispatch({ type: "hold", held }), [held]);
  useEffect(() => dispatch({ type: "rest", resting }), [resting]);
  useEffect(() => dispatch({ type: "whole", value: whole }), [whole]);

  useEffect(() => {
    const target = audio();
    if (target !== null) {
      target.volume = volume;
      target.muted = muted;
    }
  }, [audio, volume, muted]);

  useEffect(() => {
    const target = audio();
    if (target === null) {
      return;
    }
    const onEnded = () => dispatch({ type: "ended" });
    const onError = () => dispatch({ type: "failed" });
    target.addEventListener("ended", onEnded);
    target.addEventListener("error", onError);
    return () => {
      target.removeEventListener("ended", onEnded);
      target.removeEventListener("error", onError);
    };
  }, [audio]);

  useEffect(() => {
    const target = audio();
    if (target === null) {
      return;
    }
    if (!playing || url === undefined) {
      target.pause();
      return;
    }
    ticket.current += 1;
    const mine = ticket.current;
    const failed = () => {
      if (mine === ticket.current) {
        dispatch({ type: "failed" });
      }
    };
    if (loaded.current?.url === url) {
      target.play().catch(failed);
    } else {
      loadAyahBlob(url, sharedAudioCache())
        .then((blob) => {
          if (mine !== ticket.current) {
            return;
          }
          if (loaded.current !== null) {
            URL.revokeObjectURL(loaded.current.objectUrl);
          }
          const objectUrl = URL.createObjectURL(blob);
          loaded.current = { url, objectUrl };
          target.src = objectUrl;
          return target.play();
        })
        .catch(failed);
    }
    return () => {
      ticket.current += 1;
    };
  }, [audio, playing, url]);

  useEffect(() => {
    if (state.restarts === seenRestarts.current) {
      return;
    }
    seenRestarts.current = state.restarts;
    const target = element.current;
    if (target === null || loaded.current === null) {
      return;
    }
    target.currentTime = 0;
    if (playingRef.current) {
      const mine = ticket.current;
      target.play().catch(() => {
        if (mine === ticket.current) {
          dispatch({ type: "failed" });
        }
      });
    }
  }, [state.restarts]);

  useEffect(() => {
    if (passage !== null && element.current !== null && loaded.current !== null) {
      element.current.currentTime = 0;
    }
  }, [passage]);

  useEffect(() => {
    if (playing && nextUrl !== undefined) {
      loadAyahBlob(nextUrl, sharedAudioCache()).catch(() => undefined);
    }
  }, [playing, nextUrl]);

  useEffect(
    () => () => {
      element.current?.pause();
      if (loaded.current !== null) {
        URL.revokeObjectURL(loaded.current.objectUrl);
        loaded.current = null;
      }
    },
    [],
  );

  const play = useCallback(() => dispatch({ type: "play" }), []);
  const pause = useCallback(() => dispatch({ type: "pause" }), []);
  const toggle = useCallback(() => dispatch({ type: playing ? "pause" : "play" }), [playing]);
  const next = useCallback(() => dispatch({ type: "next" }), []);
  const previous = useCallback(() => dispatch({ type: "previous", elapsed: element.current?.currentTime ?? 0 }), []);

  return {
    state,
    clip,
    onBasmala: passage?.basmala != null && state.index === 0,
    play,
    pause,
    toggle,
    next,
    previous,
  };
}
