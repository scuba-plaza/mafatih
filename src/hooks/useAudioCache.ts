import { useCallback, useEffect, useRef, useState } from "react";
import {
  type AudioCacheUsage,
  audioCacheSupported,
  audioCacheUsage,
  clearAudioCache,
  EMPTY_USAGE,
} from "~/storage/audio-cache.ts";

export interface AudioCache {
  supported: boolean;
  usage: AudioCacheUsage;
  busy: boolean;
  refresh: () => void;
  clear: () => void;
}

export function useAudioCache(active: boolean): AudioCache {
  const supported = audioCacheSupported();
  const [usage, setUsage] = useState<AudioCacheUsage>(EMPTY_USAGE);
  const [busy, setBusy] = useState(false);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const show = useCallback((pending: Promise<AudioCacheUsage>) => {
    pending.then((next) => {
      if (aliveRef.current) {
        setUsage(next);
        setBusy(false);
      }
    });
  }, []);

  const refresh = useCallback(() => {
    if (supported) {
      show(audioCacheUsage());
    }
  }, [supported, show]);

  const clear = useCallback(() => {
    if (!supported) {
      return;
    }
    setBusy(true);
    show(clearAudioCache().then(audioCacheUsage));
  }, [supported, show]);

  useEffect(() => {
    if (active) {
      refresh();
    }
  }, [active, refresh]);

  return { supported, usage, busy, refresh, clear };
}
