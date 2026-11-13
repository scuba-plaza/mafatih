import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { replaceRoute } from "~/app/useRoute.ts";
import { unlockedMarks } from "~/practice/ladder.ts";
import { lessonOf, recordLesson } from "~/stats/history.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { requiredMarks } from "~/text/vocalization.ts";
import type { Sample } from "~/typing/session.ts";
import type { TrainerResult } from "~/typing/useTrainer.ts";
import { applyRecitationAyah } from "./outcome.ts";
import { buildPassage, type Passage } from "./passage.ts";
import {
  completionsOf,
  endsOrder,
  type Position,
  passageBefore,
  positionAfter,
  type RecitationProgress,
  type RunTally,
  resumeOf,
  typedAyat,
} from "./progress.ts";
import { loadSurah, requireSurahMeta, type Surah, type SurahMeta } from "./quran.ts";

export interface SurahFinish {
  readonly completions: number;
  readonly tally: RunTally;
}

export interface Recitation {
  readonly meta: SurahMeta;
  readonly from: number;
  readonly to: number;
  readonly typed: number;
  readonly passage: Passage | null;
  readonly failed: boolean;
  readonly continues: boolean;
  readonly finish: SurahFinish | null;
  readonly previous: Position;
  readonly next: Position;
  readonly target: Position;
  readonly endsTheOrder: boolean;
  readonly recordAyah: (index: number, samples: readonly Sample[]) => void;
  readonly recordPassage: (result: TrainerResult) => void;
  readonly go: (position: Position) => void;
  readonly advance: () => void;
  readonly restartSurah: () => void;
  readonly consumeContinue: () => void;
}

function startFor(surah: number, ayah: number | null, saved: RecitationProgress): Position {
  return { surah, ayah: Math.min(ayah ?? resumeOf(saved, surah), requireSurahMeta(surah).ayat) };
}

export function useRecitation(surah: number, ayah: number | null): Recitation {
  const { profile, update } = useProfile();
  const { ayatPerLesson, surahOrder: order, vocalization } = profile.settings;
  const key = `${surah}:${ayah ?? ""}`;
  const pin = () => ({ key, start: startFor(surah, ayah, profile.recitation) });
  const [pinned, setPinned] = useState(pin);
  const [loaded, setLoaded] = useState<{ readonly number: number; readonly surah: Surah | null } | null>(null);
  const [continuedAt, setContinuedAt] = useState<Position | null>(null);
  const [finished, setFinished] = useState<(SurahFinish & { readonly key: string }) | null>(null);
  const finishedKey = useRef<string | null>(null);

  const shown = pinned.key === key ? pinned : pin();
  if (shown !== pinned) {
    setPinned(shown);
  }
  const { start } = shown;
  const number = start.surah;
  const meta = requireSurahMeta(number);
  const to = Math.min(start.ayah + ayatPerLesson - 1, meta.ayat);
  const { unlocked } = profile.ladder;
  if (finished !== null && finished.key !== key) {
    setFinished(null);
  }
  const finish = finished?.key === key ? finished : null;

  useEffect(() => {
    let wanted = true;
    const keep = (result: Surah | null) => {
      if (wanted) {
        setLoaded({ number, surah: result });
      }
    };
    loadSurah(number).then(keep, () => keep(null));
    return () => {
      wanted = false;
    };
  }, [number]);

  const answer = loaded?.number === number ? loaded : null;
  const text = answer?.surah ?? null;
  const required = useMemo(() => requiredMarks(vocalization, unlockedMarks({ unlocked })), [vocalization, unlocked]);
  const passage = useMemo(
    () => (text === null ? null : buildPassage(text, start.ayah, ayatPerLesson, required)),
    [text, start, ayatPerLesson, required],
  );

  const recordAyah = useCallback(
    (index: number, samples: readonly Sample[]) => {
      const typedAyah = passage?.ayat[index]?.ayah;
      if (typedAyah === undefined) {
        return;
      }
      const caught: { tally: RunTally | null } = { tally: null };
      finishedKey.current = null;
      const next = update((current) => {
        const state = { stats: current.stats.recitation, recitation: current.recitation };
        const outcome = applyRecitationAyah(state, { surah: number, ayah: typedAyah }, samples, order);
        caught.tally = outcome.finished;
        return { ...current, stats: { ...current.stats, recitation: outcome.stats }, recitation: outcome.recitation };
      });
      if (caught.tally !== null) {
        finishedKey.current = key;
        setFinished({ key, tally: caught.tally, completions: completionsOf(next.recitation, number) });
      }
    },
    [passage, number, order, update, key],
  );

  const go = useCallback((position: Position) => {
    replaceRoute({ page: "recitation", surah: position.surah, ayah: position.ayah });
  }, []);

  const next = positionAfter({ surah: number, ayah: to }, order);

  const recordPassage = useCallback(
    ({ metrics }: TrainerResult) => {
      update((current) => ({
        ...current,
        history: recordLesson(current.history, lessonOf("recitation", metrics, Date.now())),
      }));
      if (finishedKey.current !== key) {
        setContinuedAt(next);
        go(next);
      }
    },
    [update, key, next, go],
  );

  const finishesSurah = finish !== null;
  const lastAyah: Position = { surah: number, ayah: finishesSurah ? meta.ayat : to };
  const target = finishesSurah ? positionAfter(lastAyah, order) : next;

  const advance = useCallback(() => {
    setContinuedAt(target);
    go(target);
  }, [target, go]);

  const restartSurah = useCallback(() => {
    setFinished(null);
    setContinuedAt({ surah: number, ayah: 1 });
    go({ surah: number, ayah: 1 });
  }, [number, go]);
  const consumeContinue = useCallback(() => setContinuedAt(null), []);

  return {
    meta,
    from: start.ayah,
    to,
    typed: typedAyat(profile.recitation, number),
    passage,
    failed: answer !== null && answer.surah === null,
    continues: continuedAt?.surah === number && continuedAt.ayah === start.ayah,
    finish,
    previous: passageBefore({ surah: number, ayah: start.ayah }, ayatPerLesson, order),
    next,
    target,
    endsTheOrder: endsOrder(lastAyah, order),
    recordAyah,
    recordPassage,
    go,
    advance,
    restartSurah,
    consumeContinue,
  };
}
