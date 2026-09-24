import { surahByNumber, surahs } from "~/engine/corpus/corpus.ts";
import type { LessonSource } from "~/engine/lessons/lesson.ts";

export type SurahOrder = "mushaf" | "juz-amma";

export const SURAH_ORDERS: readonly SurahOrder[] = ["mushaf", "juz-amma"];

export const DEFAULT_SURAH_ORDER: SurahOrder = "mushaf";

export const STAR_ACCURACY = 0.95;

const JUZ_AMMA_FIRST = 78;

export type AyahRange = readonly [number, number];

export interface Tally {
  chars: number;
  keystrokes: number;
  errors: number;
  elapsedMs: number;
}

export interface Run extends Tally {
  typed: readonly AyahRange[];
}

export interface SurahRecord {
  run: Run;
  resume: number;
  completions: number;
  bestAccuracy: number;
  bestCpm: number;
  completedAt: number | null;
}

export interface RecitationPosition {
  surah: number;
  ayah: number;
}

export interface Recitation {
  position: RecitationPosition;
  surahs: Readonly<Record<number, SurahRecord>>;
}

export interface PassageResult extends Tally {
  at: number;
}

export interface SurahCompletion extends Tally {
  surah: number;
  ayat: number;
  accuracy: number;
  cpm: number;
  completions: number;
  starred: boolean;
  next: number;
}

export interface SurahProgress {
  covered: number;
  total: number;
  fraction: number;
  complete: boolean;
  starred: boolean;
  completions: number;
}

export function isSurahOrder(value: unknown): value is SurahOrder {
  return typeof value === "string" && (SURAH_ORDERS as readonly string[]).includes(value);
}

export function ayatCount(surah: number): number {
  return surahByNumber(surah)?.ayatCount ?? 0;
}

const SEQUENCES: Readonly<Record<SurahOrder, readonly number[]>> = {
  mushaf: surahs.map((s) => s.n),
  "juz-amma": [
    ...surahs
      .filter((s) => s.n >= JUZ_AMMA_FIRST)
      .map((s) => s.n)
      .reverse(),
    ...surahs.filter((s) => s.n < JUZ_AMMA_FIRST).map((s) => s.n),
  ],
};

export function surahSequence(order: SurahOrder): readonly number[] {
  return SEQUENCES[order];
}

function step(surah: number, order: SurahOrder, by: number): number {
  const sequence = surahSequence(order);
  const index = sequence.indexOf(surah);
  const at = index < 0 ? 0 : (index + by + sequence.length) % sequence.length;
  return sequence[at] ?? surah;
}

export function nextSurah(surah: number, order: SurahOrder): number {
  return step(surah, order, 1);
}

export function previousSurah(surah: number, order: SurahOrder): number {
  return step(surah, order, -1);
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function clampPosition(position: { surah: unknown; ayah: unknown }): RecitationPosition {
  const surah = clampInt(position.surah, 1, surahs.length, 1);
  const ayah = clampInt(position.ayah, 1, Math.max(1, ayatCount(surah)), 1);
  return { surah, ayah };
}

export function emptyRun(): Run {
  return { typed: [], chars: 0, keystrokes: 0, errors: 0, elapsedMs: 0 };
}

export function emptyRecord(): SurahRecord {
  return { run: emptyRun(), resume: 1, completions: 0, bestAccuracy: 0, bestCpm: 0, completedAt: null };
}

export function emptyRecitation(order: SurahOrder = DEFAULT_SURAH_ORDER): Recitation {
  return { position: { surah: surahSequence(order)[0] ?? 1, ayah: 1 }, surahs: {} };
}

export function recordOf(recitation: Recitation, surah: number): SurahRecord {
  return recitation.surahs[surah] ?? emptyRecord();
}

export function addRange(ranges: readonly AyahRange[], from: number, to: number): AyahRange[] {
  const all = [...ranges, [Math.min(from, to), Math.max(from, to)] as const].sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of all) {
    const last = merged[merged.length - 1];
    if (last !== undefined && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

export function coveredAyat(ranges: readonly AyahRange[]): number {
  return ranges.reduce((sum, [start, end]) => sum + end - start + 1, 0);
}

export function firstGap(ranges: readonly AyahRange[], total: number): number | undefined {
  let expected = 1;
  for (const [start, end] of ranges) {
    if (start > expected) {
      return expected;
    }
    expected = Math.max(expected, end + 1);
  }
  return expected <= total ? expected : undefined;
}

export function accuracyOfTally(tally: Tally): number {
  return tally.keystrokes === 0 ? 0 : (tally.keystrokes - tally.errors) / tally.keystrokes;
}

export function cpmOfTally(tally: Tally): number {
  return tally.elapsedMs <= 0 ? 0 : tally.chars / (tally.elapsedMs / 60_000);
}

export function resumeOf(recitation: Recitation, surah: number): number {
  const total = ayatCount(surah);
  const resume = recordOf(recitation, surah).resume;
  return resume >= 1 && resume <= total ? resume : 1;
}

export function progressOf(recitation: Recitation, surah: number): SurahProgress {
  const record = recordOf(recitation, surah);
  const total = ayatCount(surah);
  const complete = record.completions > 0;
  const covered = complete ? total : Math.min(total, coveredAyat(record.run.typed));
  return {
    covered,
    total,
    fraction: total === 0 ? 0 : covered / total,
    complete,
    starred: complete && record.bestAccuracy >= STAR_ACCURACY,
    completions: record.completions,
  };
}

export function completedSurahs(recitation: Recitation): number {
  return Object.values(recitation.surahs).filter((record) => record.completions > 0).length;
}

export function passageAfter(surah: number, toAyah: number, order: SurahOrder): RecitationPosition {
  return toAyah < ayatCount(surah) ? { surah, ayah: toAyah + 1 } : { surah: nextSurah(surah, order), ayah: 1 };
}

export function passageBefore(
  surah: number,
  fromAyah: number,
  ayatPerLesson: number,
  order: SurahOrder,
): RecitationPosition {
  if (fromAyah > 1) {
    return { surah, ayah: Math.max(1, fromAyah - ayatPerLesson) };
  }
  const previous = previousSurah(surah, order);
  return { surah: previous, ayah: Math.max(1, ayatCount(previous) - ayatPerLesson + 1) };
}

function withRecord(
  recitation: Recitation,
  surah: number,
  record: SurahRecord,
  position: RecitationPosition,
): Recitation {
  return { position, surahs: { ...recitation.surahs, [surah]: record } };
}

export interface RecitationUpdate {
  recitation: Recitation;
  completion: SurahCompletion | null;
}

export function recordPassage(
  recitation: Recitation,
  source: LessonSource,
  result: PassageResult,
  order: SurahOrder,
): RecitationUpdate {
  const { surah, fromAyah, toAyah } = source;
  if (source.kind !== "recite" || surah === undefined || fromAyah === undefined || toAyah === undefined) {
    return { recitation, completion: null };
  }
  const total = ayatCount(surah);
  if (total === 0) {
    return { recitation, completion: null };
  }

  const record = recordOf(recitation, surah);
  const run: Run = {
    typed: addRange(record.run.typed, fromAyah, toAyah),
    chars: record.run.chars + result.chars,
    keystrokes: record.run.keystrokes + result.keystrokes,
    errors: record.run.errors + result.errors,
    elapsedMs: record.run.elapsedMs + result.elapsedMs,
  };

  if (coveredAyat(run.typed) < total) {
    const resume = toAyah < total ? toAyah + 1 : (firstGap(run.typed, total) ?? 1);
    const position = { surah, ayah: resume };
    return { recitation: withRecord(recitation, surah, { ...record, run, resume }, position), completion: null };
  }

  const accuracy = accuracyOfTally(run);
  const cpm = cpmOfTally(run);
  const completed: SurahRecord = {
    run: emptyRun(),
    resume: 1,
    completions: record.completions + 1,
    bestAccuracy: Math.max(record.bestAccuracy, accuracy),
    bestCpm: Math.max(record.bestCpm, cpm),
    completedAt: result.at,
  };
  const next = nextSurah(surah, order);
  const updated = withRecord(recitation, surah, completed, recitation.position);
  const position = { surah: next, ayah: resumeOf(updated, next) };

  return {
    recitation: { ...updated, position },
    completion: {
      surah,
      ayat: total,
      chars: run.chars,
      keystrokes: run.keystrokes,
      errors: run.errors,
      elapsedMs: run.elapsedMs,
      accuracy,
      cpm,
      completions: completed.completions,
      starred: completed.bestAccuracy >= STAR_ACCURACY,
      next,
    },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function count(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function sanitizeRanges(raw: unknown, total: number): AyahRange[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  let ranges: AyahRange[] = [];
  for (const entry of raw) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      continue;
    }
    const from = clampInt(entry[0], 1, total, 0);
    const to = clampInt(entry[1], 1, total, 0);
    if (from >= 1 && to >= 1) {
      ranges = addRange(ranges, from, to);
    }
  }
  return ranges;
}

function sanitizeRecord(raw: unknown, total: number): SurahRecord {
  if (!isRecord(raw)) {
    return emptyRecord();
  }
  const run = isRecord(raw.run) ? raw.run : {};
  const completedAt = Number(raw.completedAt);
  return {
    run: {
      typed: sanitizeRanges(run.typed, total),
      chars: count(run.chars),
      keystrokes: count(run.keystrokes),
      errors: count(run.errors),
      elapsedMs: count(run.elapsedMs),
    },
    resume: clampInt(raw.resume, 1, total, 1),
    completions: Math.floor(count(raw.completions)),
    bestAccuracy: Math.min(1, count(raw.bestAccuracy)),
    bestCpm: count(raw.bestCpm),
    completedAt: raw.completedAt !== null && Number.isFinite(completedAt) ? completedAt : null,
  };
}

export function sanitizeRecitation(raw: unknown): Recitation {
  if (!isRecord(raw)) {
    return emptyRecitation();
  }
  const position = isRecord(raw.position)
    ? clampPosition({ surah: raw.position.surah, ayah: raw.position.ayah })
    : emptyRecitation().position;
  const records: Record<number, SurahRecord> = {};
  if (isRecord(raw.surahs)) {
    for (const [key, value] of Object.entries(raw.surahs)) {
      const surah = Number(key);
      const total = ayatCount(surah);
      if (Number.isInteger(surah) && total > 0) {
        records[surah] = sanitizeRecord(value, total);
      }
    }
  }
  return { position, surahs: records };
}
