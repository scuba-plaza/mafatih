import { isRecord } from "~/lib/guards.ts";

export const MODES = ["practice", "recitation", "custom"] as const;

export type Mode = (typeof MODES)[number];

export interface LessonRecord {
  readonly at: number;
  readonly mode: Mode;
  readonly chars: number;
  readonly ms: number;
  readonly accuracy: number;
}

const MAX_LESSONS = 100;
const LATEST_DATE_MS = 8.64e15;
const DAY_MS = 86_400_000;
const MAX_CHARS = 100_000;

export function recordLesson(history: readonly LessonRecord[], lesson: LessonRecord): readonly LessonRecord[] {
  return [...history, lesson].slice(-MAX_LESSONS);
}

function isAmount(value: unknown, most: number): value is number {
  return typeof value === "number" && value >= 0 && value <= most;
}

function isMode(value: unknown): value is Mode {
  return MODES.some((mode) => mode === value);
}

function sanitizeLesson(raw: unknown): LessonRecord | undefined {
  if (!isRecord(raw)) {
    return undefined;
  }
  const { at, mode, chars, ms, accuracy } = raw;
  const amounts =
    isAmount(at, LATEST_DATE_MS) && isAmount(chars, MAX_CHARS) && Number.isInteger(chars) && isAmount(ms, DAY_MS);
  const share = typeof accuracy === "number" && accuracy >= 0 && accuracy <= 1;
  return amounts && isMode(mode) && share ? { at, mode, chars, ms, accuracy } : undefined;
}

export function sanitizeHistory(raw: unknown): readonly LessonRecord[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .slice(-MAX_LESSONS)
    .map(sanitizeLesson)
    .filter((lesson) => lesson !== undefined);
}
