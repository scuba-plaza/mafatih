import { useCallback, useEffect, useMemo, useState } from "react";
import type { RecitationRoute } from "~/app/routes.ts";
import { replaceRoute } from "~/app/useRoute.ts";
import { unlockedMarks } from "~/practice/ladder.ts";
import { recordLesson } from "~/stats/history.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { requiredMarks } from "~/text/vocalization.ts";
import type { Sample } from "~/typing/session.ts";
import type { TrainerResult } from "~/typing/useTrainer.ts";
import type { SurahOrder } from "./order.ts";
import { applyRecitationAyah } from "./outcome.ts";
import { buildPassage, type Passage } from "./passage.ts";
import { type Position, positionAfter, type RecitationProgress, resumeOf, startOf } from "./progress.ts";
import { loadSurah, type Surah, type SurahMeta, surahMeta } from "./quran.ts";

export interface Recitation {
  readonly meta: SurahMeta | undefined;
  readonly from: number;
  readonly to: number;
  readonly passage: Passage | null;
  readonly failed: boolean;
  readonly continued: boolean;
  readonly recordAyah: (index: number, samples: readonly Sample[]) => void;
  readonly recordPassage: (result: TrainerResult) => void;
  readonly next: () => void;
}

function startFor(route: RecitationRoute, saved: RecitationProgress, order: SurahOrder): Position {
  if (route.surah === null) {
    return startOf(saved, order);
  }
  const last = surahMeta(route.surah)?.ayat ?? 1;
  return { surah: route.surah, ayah: Math.min(route.ayah ?? resumeOf(saved, route.surah), last) };
}

export function useRecitation(route: RecitationRoute): Recitation {
  const { profile, update } = useProfile();
  const { ayatPerLesson, surahOrder: order, vocalization } = profile.settings;
  const [pinned, setPinned] = useState(() => ({ route, start: startFor(route, profile.recitation, order) }));
  const [loaded, setLoaded] = useState<{ readonly number: number; readonly surah: Surah | null } | null>(null);
  const [continued, setContinued] = useState(false);

  const shown = pinned.route === route ? pinned : { route, start: startFor(route, profile.recitation, order) };
  if (shown !== pinned) {
    setPinned(shown);
  }
  const { start } = shown;
  const number = start.surah;
  const meta = surahMeta(number);
  const to = Math.min(start.ayah + ayatPerLesson - 1, meta?.ayat ?? start.ayah);

  useEffect(() => {
    let wanted = true;
    const keep = (surah: Surah | null) => {
      if (wanted) {
        setLoaded({ number, surah });
      }
    };
    loadSurah(number).then(keep, () => keep(null));
    return () => {
      wanted = false;
    };
  }, [number]);

  const answer = loaded?.number === number ? loaded : null;
  const surah = answer?.surah ?? null;
  const required = useMemo(
    () => requiredMarks(vocalization, unlockedMarks(profile.ladder)),
    [vocalization, profile.ladder],
  );
  const passage = useMemo(
    () => (surah === null ? null : buildPassage(surah, start.ayah, ayatPerLesson, required)),
    [surah, start, ayatPerLesson, required],
  );

  const recordAyah = useCallback(
    (index: number, samples: readonly Sample[]) => {
      const ayah = passage?.ayat[index]?.ayah;
      if (ayah === undefined) {
        return;
      }
      update((current) => {
        const state = { stats: current.stats.recitation, recitation: current.recitation };
        const outcome = applyRecitationAyah(state, { surah: number, ayah }, samples, order);
        return {
          ...current,
          stats: { ...current.stats, recitation: outcome.stats },
          recitation: outcome.recitation,
        };
      });
    },
    [passage, number, order, update],
  );

  const recordPassage = useCallback(
    ({ metrics }: TrainerResult) => {
      const lesson = {
        at: Date.now(),
        mode: "recitation",
        chars: metrics.typedChars,
        ms: metrics.elapsedMs,
        accuracy: metrics.accuracy,
      } as const;
      update((current) => ({ ...current, history: recordLesson(current.history, lesson) }));
    },
    [update],
  );

  const next = useCallback(() => {
    const after = positionAfter({ surah: number, ayah: to }, order);
    setContinued(true);
    replaceRoute({ page: "recitation", surah: after.surah, ayah: after.ayah });
  }, [number, to, order]);

  return {
    meta,
    from: start.ayah,
    to,
    passage,
    failed: answer !== null && answer.surah === null,
    continued,
    recordAyah,
    recordPassage,
    next,
  };
}
