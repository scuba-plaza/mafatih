import { ayatOfSurah, BASMALA_TEXT, opensWithBasmala, startsWithBasmala } from "~/engine/corpus/corpus.ts";
import { stripToTier, type Tier } from "~/engine/corpus/normalize.ts";
import {
  type AyahSpan,
  type BasmalaSpan,
  clampAyatPerLesson,
  DEFAULT_AYAT_PER_LESSON,
  type Lesson,
} from "~/engine/lessons/lesson.ts";

export interface ReciteOptions {
  surah: number;
  tier: Tier;
  fromAyah?: number;
  maxAyat?: number;
}

interface Span {
  start: number;
  end: number;
}

export function generateRecitePassage(options: ReciteOptions): Lesson {
  const { surah, tier } = options;
  const fromAyah = options.fromAyah ?? 1;
  const maxAyat = clampAyatPerLesson(options.maxAyat ?? DEFAULT_AYAT_PER_LESSON);

  const verses = ayatOfSurah(surah);
  if (verses.length === 0) {
    throw new Error(`unknown surah: ${surah}`);
  }

  const startIndex = Math.max(
    0,
    verses.findIndex((v) => v.ayah === fromAyah),
  );

  const parts: string[] = [];
  const spans: AyahSpan[] = [];
  const breaks: number[] = [];
  const basmalaText = stripToTier(BASMALA_TEXT, tier);
  let basmala: BasmalaSpan | null = null;
  let toAyah = fromAyah;
  let offset = 0;

  const push = (text: string): Span => {
    const span = { start: offset, end: offset + [...text].length };
    parts.push(text);
    offset = span.end + 1;
    return span;
  };

  for (const verse of verses.slice(startIndex)) {
    if (spans.length >= maxAyat) {
      break;
    }
    const rendered = stripToTier(verse.text, tier);

    if (opensWithBasmala(verse.text)) {
      const head = push(basmalaText);
      basmala = { ...head, standalone: true };
      breaks.push(head.end + 1);
      spans.push({ ayah: verse.ayah, ...push(rendered.slice(basmalaText.length + 1)) });
    } else {
      const span = push(rendered);
      if (startsWithBasmala(verse.text)) {
        basmala = { ...span, standalone: false };
        breaks.push(span.end + 1);
      }
      spans.push({ ayah: verse.ayah, ...span });
    }

    toAyah = verse.ayah;
  }

  return {
    text: parts.join(" "),
    tier,
    source: { kind: "recite", surah, fromAyah, toAyah },
    ayat: spans,
    breaks,
    basmala,
  };
}
