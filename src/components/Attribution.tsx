import { surahByNumber } from "~/engine/corpus/corpus.ts";
import type { LessonSource } from "~/engine/lessons/lesson.ts";

export interface AttributionProps {
  source: LessonSource;
}

const CLASS = "text-xs text-stone-400";

export default function Attribution({ source }: AttributionProps) {
  if (source.kind === "custom") {
    return (
      <p data-cy="attribution" data-kind="custom" className={CLASS}>
        Your own text. Custom lessons are practice only — they do not change your progress or statistics.
      </p>
    );
  }

  if (source.kind === "adaptive") {
    return (
      <p data-cy="attribution" data-kind="adaptive" className={CLASS}>
        Words from the Qur'an, filtered to the letters you have unlocked.
      </p>
    );
  }

  const surah = source.surah === undefined ? undefined : surahByNumber(source.surah);
  if (surah === undefined) {
    return null;
  }
  const range = source.fromAyah === source.toAyah ? `${source.fromAyah}` : `${source.fromAyah}–${source.toAyah}`;

  return (
    <p data-cy="attribution" data-kind="recite" data-surah={surah.n} className={CLASS}>
      <span lang="ar" className="font-arabic text-sm text-stone-500">
        {surah.name}
      </span>{" "}
      · {surah.tname} {surah.n}:{range}
    </p>
  );
}
