import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type AyahClip,
  afterAyahOf,
  clampVolume,
  firstClipOf,
  passageClips,
  type Reciter,
  reciterOption,
} from "~/engine/audio/reciters.ts";
import { surahByNumber } from "~/engine/corpus/corpus.ts";
import type { Lesson } from "~/engine/lessons/lesson.ts";
import { useLatest } from "~/hooks/useLatest.ts";
import { cacheAyah, warmAyah } from "~/storage/audio-cache.ts";
import type { Settings } from "~/storage/profile.ts";

const RESTART_THRESHOLD_SECONDS = 2;

export interface Recitation {
  available: boolean;
  surah: number;
  ayah: number | null | undefined;
  basmala: boolean;
  clips: readonly AyahClip[];
  clipIndex: number;
  reciter: Reciter;
  playing: boolean;
  loading: boolean;
  failed: boolean;
  volume: number;
  muted: boolean;
  loop: boolean;
  progress: number;
  toggle: () => void;
  next: () => void;
  previous: () => void;
  seek: (fraction: number) => void;
  setVolume: (value: number) => void;
  commitVolume: () => void;
  toggleMute: () => void;
  toggleLoop: () => void;
}

export interface RecitationOptions {
  lesson: Lesson;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  active?: boolean;
}

export function useRecitation({ lesson, settings, updateSettings, active = true }: RecitationOptions): Recitation {
  const { source } = lesson;
  const surah = source.surah ?? 0;
  const fromAyah = source.fromAyah ?? 0;
  const toAyah = source.toAyah ?? 0;
  const available = source.kind === "recite" && surah > 0 && lesson.ayat.length > 0;

  const spans = lesson.ayat;
  const leadingBasmala = lesson.basmala?.standalone === true;
  const clips = useMemo(
    () => (available ? passageClips(settings.reciter, surah, spans, leadingBasmala) : []),
    [available, settings.reciter, surah, spans, leadingBasmala],
  );
  const reciter = reciterOption(settings.reciter);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const loadedRef = useRef<string | null>(null);
  const tokenRef = useRef(0);

  const [clipIndex, setClipIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setLiveVolume] = useState(() => clampVolume(settings.volume));
  const [muted, setMuted] = useState(settings.muted);

  const clipsRef = useLatest(clips);
  const clipIndexRef = useLatest(clipIndex);
  const playingRef = useLatest(playing);
  const autoAdvanceRef = useLatest(settings.autoAdvance);
  const loopRef = useLatest(settings.loop);

  const current = clips[clipIndex];
  const ayah = current?.ayah;
  const basmala = current?.basmala === true;

  const element = useCallback((): HTMLAudioElement | null => {
    if (typeof Audio === "undefined") {
      return null;
    }
    if (audioRef.current === null) {
      const audio = new Audio();
      audio.preload = "auto";
      audioRef.current = audio;
    }
    return audioRef.current;
  }, []);

  const start = useCallback((audio: HTMLAudioElement) => {
    const promise = audio.play();
    if (promise === undefined) {
      return;
    }
    promise.catch(() => {
      if (audio.readyState === 0) {
        return;
      }
      setPlaying(false);
      setFailed(true);
    });
  }, []);

  const halt = useCallback(() => {
    setPlaying(false);
    setProgress(0);
  }, []);

  const stop = useCallback(() => {
    audioRef.current?.pause();
    halt();
  }, [halt]);

  useEffect(() => {
    if (!active) {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, [active]);

  const passageKey = `${surah}:${fromAyah}:${toAyah}:${settings.reciter}`;
  const passageRef = useRef(passageKey);

  useEffect(() => {
    setClipIndex(0);
    setFailed(false);
    setProgress(0);
    audioRef.current?.pause();
    if (passageRef.current !== passageKey) {
      passageRef.current = passageKey;
      loadedRef.current = null;
    }
    if (!available) {
      setPlaying(false);
    }
  }, [available, passageKey]);

  useEffect(() => {
    const audio = element();
    if (audio !== null) {
      audio.volume = muted ? 0 : volume;
    }
  }, [volume, muted, element]);

  useEffect(() => {
    const clip = clips[clipIndex];
    const audio = element();
    if (clip === undefined || audio === null) {
      return;
    }
    if (loadedRef.current === clip.url) {
      if (playing) {
        start(audio);
      }
      return;
    }

    loadedRef.current = clip.url;
    tokenRef.current += 1;
    const token = tokenRef.current;
    setLoading(true);
    setProgress(0);

    cacheAyah(clip.url)
      .then((blob) => {
        if (token !== tokenRef.current) {
          return;
        }
        if (objectUrlRef.current !== null) {
          URL.revokeObjectURL(objectUrlRef.current);
        }
        objectUrlRef.current = URL.createObjectURL(blob);
        audio.src = objectUrlRef.current;
        audio.volume = muted ? 0 : volume;
        setLoading(false);
        setFailed(false);
        if (playingRef.current) {
          start(audio);
        }
      })
      .catch(() => {
        if (token !== tokenRef.current) {
          return;
        }
        loadedRef.current = null;
        setFailed(true);
        setLoading(false);
        setPlaying(false);
      });
  }, [clips, clipIndex, playing, playingRef, element, start, muted, volume]);

  useEffect(() => {
    const upcoming = clips[clipIndex + 1];
    if (upcoming !== undefined) {
      warmAyah(upcoming.url);
    }
  }, [clips, clipIndex]);

  useEffect(() => {
    const audio = element();
    if (audio === null) {
      return;
    }

    const onEnded = () => {
      const all = clipsRef.current;
      const index = clipIndexRef.current;
      const playingClip = all[index];
      const upcoming = all[index + 1];
      const continues =
        playingClip !== undefined &&
        upcoming !== undefined &&
        (upcoming.ayah === playingClip.ayah || autoAdvanceRef.current);
      if (continues) {
        setClipIndex(index + 1);
        return;
      }
      if (loopRef.current && upcoming === undefined && all.length > 0) {
        if (index === 0) {
          audio.currentTime = 0;
          setProgress(0);
          start(audio);
        } else {
          setClipIndex(0);
        }
        return;
      }
      halt();
    };
    const onTimeUpdate = () => {
      const total = audio.duration;
      setProgress(Number.isFinite(total) && total > 0 ? audio.currentTime / total : 0);
    };
    const onError = () => {
      setFailed(true);
      setLoading(false);
      setPlaying(false);
    };
    const onWaiting = () => setLoading(true);
    const onPlaying = () => setLoading(false);

    const listeners = [
      ["ended", onEnded],
      ["timeupdate", onTimeUpdate],
      ["error", onError],
      ["waiting", onWaiting],
      ["playing", onPlaying],
    ] as const;

    for (const [type, listener] of listeners) {
      audio.addEventListener(type, listener);
    }
    return () => {
      for (const [type, listener] of listeners) {
        audio.removeEventListener(type, listener);
      }
    };
  }, [element, halt, start, clipsRef, clipIndexRef, autoAdvanceRef, loopRef]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (objectUrlRef.current !== null) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = element();
    if (clipsRef.current.length === 0 || audio === null) {
      return;
    }
    if (playingRef.current) {
      audio.pause();
      setPlaying(false);
      return;
    }
    setFailed(false);
    setPlaying(true);
    start(audio);
  }, [element, start, clipsRef, playingRef]);

  const restart = useCallback(() => {
    const audio = audioRef.current;
    if (audio !== null) {
      audio.currentTime = 0;
    }
    setProgress(0);
  }, []);

  const next = useCallback(() => {
    const all = clipsRef.current;
    const index = clipIndexRef.current;
    if (all[index] === undefined) {
      return;
    }
    const after = afterAyahOf(all, index);
    if (after < all.length) {
      setClipIndex(after);
      return;
    }
    if (!loopRef.current) {
      setClipIndex(0);
      stop();
      return;
    }
    if (index === 0) {
      restart();
      return;
    }
    setClipIndex(0);
  }, [stop, restart, clipsRef, clipIndexRef, loopRef]);

  const previous = useCallback(() => {
    const all = clipsRef.current;
    const index = clipIndexRef.current;
    const playingClip = all[index];
    if (playingClip === undefined) {
      return;
    }
    const first = firstClipOf(all, playingClip.ayah);
    const elapsed = audioRef.current?.currentTime ?? 0;
    if (elapsed > RESTART_THRESHOLD_SECONDS || index > first) {
      if (index === first) {
        restart();
      } else {
        setClipIndex(first);
      }
      return;
    }
    const before = all[first - 1];
    if (before === undefined) {
      restart();
      return;
    }
    setClipIndex(firstClipOf(all, before.ayah));
  }, [restart, clipsRef, clipIndexRef]);

  const seek = useCallback((fraction: number) => {
    const audio = audioRef.current;
    if (audio === null || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }
    const clamped = Math.min(1, Math.max(0, fraction));
    audio.currentTime = clamped * audio.duration;
    setProgress(clamped);
  }, []);

  const setVolume = useCallback((value: number) => {
    setLiveVolume(clampVolume(value));
  }, []);

  const commitVolume = useCallback(() => {
    updateSettings({ volume });
  }, [updateSettings, volume]);

  const toggleMute = useCallback(() => {
    const flipped = !muted;
    setMuted(flipped);
    updateSettings({ muted: flipped });
  }, [muted, updateSettings]);

  const toggleLoop = useCallback(() => {
    updateSettings({ loop: !settings.loop });
  }, [settings.loop, updateSettings]);

  useEffect(() => {
    if (!available || typeof navigator === "undefined" || !("mediaSession" in navigator)) {
      return;
    }
    const meta = surahByNumber(surah);
    if (ayah === undefined || meta === undefined) {
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: ayah === null ? `${meta.tname} · bismillah` : `${surah}:${ayah}`,
      artist: `${reciter.name} · ${reciter.style}`,
      album: meta.tname,
    });
    navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    navigator.mediaSession.setActionHandler("play", toggle);
    navigator.mediaSession.setActionHandler("pause", toggle);
    navigator.mediaSession.setActionHandler("previoustrack", previous);
    navigator.mediaSession.setActionHandler("nexttrack", next);
  }, [available, ayah, surah, reciter, playing, toggle, previous, next]);

  return {
    available,
    surah,
    ayah,
    basmala,
    clips,
    clipIndex,
    reciter,
    playing,
    loading,
    failed,
    volume,
    muted,
    loop: settings.loop,
    progress,
    toggle,
    next,
    previous,
    seek,
    setVolume,
    commitVolume,
    toggleMute,
    toggleLoop,
  };
}
