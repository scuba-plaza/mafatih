import type { Tier } from "~/engine/corpus/normalize.ts";
import { nearestStep } from "~/engine/guards.ts";

export type LessonKind = "adaptive" | "recite" | "custom";

export interface LessonSource {
  kind: LessonKind;
  surah?: number;
  fromAyah?: number;
  toAyah?: number;
}

export interface AyahSpan {
  ayah: number;
  start: number;
  end: number;
}

export interface BasmalaSpan {
  start: number;
  end: number;
  standalone: boolean;
}

export interface Lesson {
  text: string;
  tier: Tier;
  source: LessonSource;
  ayat: readonly AyahSpan[];
  breaks: readonly number[];
  basmala: BasmalaSpan | null;
}

export function ayahAt(lesson: Lesson, index: number): number | undefined {
  return lesson.ayat.find((span) => span.start <= index && index < span.end)?.ayah;
}

export function ayahRange(source: LessonSource): string {
  return source.fromAyah === source.toAyah ? `${source.fromAyah}` : `${source.fromAyah}–${source.toAyah}`;
}

export function countsTowardProgress(source: LessonSource): boolean {
  return source.kind !== "custom";
}

export const AYAT_PER_LESSON: readonly number[] = [1, 2, 3, 4, 5, 6, 8, 10, 15, 20];

export const DEFAULT_AYAT_PER_LESSON = 4;

export function clampAyatPerLesson(value: unknown): number {
  return nearestStep(value, AYAT_PER_LESSON, DEFAULT_AYAT_PER_LESSON);
}
