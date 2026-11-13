import { isCount, isRecord } from "~/lib/guards.ts";
import { type SurahOrder, surahOrder } from "./order.ts";
import { SURAH_COUNT, surahMeta } from "./quran.ts";

export interface Position {
  readonly surah: number;
  readonly ayah: number;
}

export type AyahRange = readonly [number, number];

export const STAR_ACCURACY = 0.95;

export interface RunTally {
  readonly correct: number;
  readonly total: number;
  readonly ms: number;
}

export const NO_RUN: RunTally = { correct: 0, total: 0, ms: 0 };

export interface SurahProgress {
  readonly typed: readonly AyahRange[];
  readonly completions: number;
  readonly run: RunTally;
  readonly best: number;
}

export interface RecitationProgress {
  readonly position: Position | null;
  readonly surahs: Readonly<Record<number, SurahProgress>>;
}

const NOT_STARTED: SurahProgress = { typed: [], completions: 0, run: NO_RUN, best: 0 };

function ayatIn(surah: number): number {
  return surahMeta(surah)?.ayat ?? 0;
}

function exists(position: Position): boolean {
  return Number.isInteger(position.ayah) && position.ayah >= 1 && position.ayah <= ayatIn(position.surah);
}

function recordOf(progress: RecitationProgress, surah: number): SurahProgress {
  return Object.hasOwn(progress.surahs, surah) ? (progress.surahs[surah] ?? NOT_STARTED) : NOT_STARTED;
}

function merged(ranges: readonly AyahRange[]): AyahRange[] {
  const result: [number, number][] = [];
  for (const [start, end] of [...ranges].sort((a, b) => a[0] - b[0])) {
    const last = result.at(-1);
    if (last !== undefined && start <= last[1] + 1) {
      last[1] = Math.max(last[1], end);
    } else {
      result.push([start, end]);
    }
  }
  return result;
}

export function addTally(a: RunTally, b: RunTally): RunTally {
  return { correct: a.correct + b.correct, total: a.total + b.total, ms: a.ms + b.ms };
}

export function accuracyOf(tally: RunTally): number {
  return tally.total === 0 ? 0 : tally.correct / tally.total;
}

const MS_PER_MINUTE = 60_000;

export function typingSpeed(tally: RunTally): number {
  return tally.ms > 0 ? tally.correct / (tally.ms / MS_PER_MINUTE) : 0;
}

function covers(ranges: readonly AyahRange[], ayah: number): boolean {
  return ranges.some(([start, end]) => start <= ayah && ayah <= end);
}

function countOf(ranges: readonly AyahRange[]): number {
  return ranges.reduce((sum, [start, end]) => sum + end - start + 1, 0);
}

function neighbour(surah: number, order: SurahOrder, step: 1 | -1): number {
  const sequence = surahOrder(order);
  return sequence.at((sequence.indexOf(surah) + step) % sequence.length) ?? surah;
}

export function initialRecitation(): RecitationProgress {
  return { position: null, surahs: {} };
}

export function startOf(progress: RecitationProgress, order: SurahOrder): Position {
  return progress.position ?? { surah: surahOrder(order)[0] ?? 1, ayah: 1 };
}

export function typedAyat(progress: RecitationProgress, surah: number): number {
  return countOf(recordOf(progress, surah).typed);
}

export function completionsOf(progress: RecitationProgress, surah: number): number {
  return recordOf(progress, surah).completions;
}

export function runOf(progress: RecitationProgress, surah: number): RunTally {
  return recordOf(progress, surah).run;
}

export function starredOf(progress: RecitationProgress, surah: number): boolean {
  return recordOf(progress, surah).best >= STAR_ACCURACY;
}

export function completedSurahs(progress: RecitationProgress): number {
  return Object.values(progress.surahs).filter((record) => record.completions > 0).length;
}

export function starCount(progress: RecitationProgress): number {
  return Object.values(progress.surahs).filter((record) => record.best >= STAR_ACCURACY).length;
}

export function resumeOf(progress: RecitationProgress, surah: number): number {
  const [first] = recordOf(progress, surah).typed;
  return first === undefined || first[0] > 1 ? 1 : first[1] + 1;
}

export function positionAfter(position: Position, order: SurahOrder): Position {
  return position.ayah < ayatIn(position.surah)
    ? { surah: position.surah, ayah: position.ayah + 1 }
    : { surah: neighbour(position.surah, order, 1), ayah: 1 };
}

export function endsOrder(position: Position, order: SurahOrder): boolean {
  return position.ayah === ayatIn(position.surah) && position.surah === surahOrder(order).at(-1);
}

export function passageBefore(position: Position, maxAyat: number, order: SurahOrder): Position {
  const surah = position.ayah > 1 ? position.surah : neighbour(position.surah, order, -1);
  const size = Math.min(Math.max(1, Math.floor(maxAyat) || 1), Math.max(1, ayatIn(surah)));
  return position.ayah > 1
    ? { surah, ayah: Math.max(1, position.ayah - size) }
    : { surah, ayah: 1 + Math.floor((ayatIn(surah) - 1) / size) * size };
}

export function recordAyah(
  progress: RecitationProgress,
  position: Position,
  order: SurahOrder,
  tally: RunTally = NO_RUN,
): RecitationProgress {
  if (!exists(position)) {
    return progress;
  }
  const { surah, ayah } = position;
  const before = recordOf(progress, surah);
  const typed = merged([...before.typed, [ayah, ayah]]);
  const run = covers(before.typed, ayah) ? before.run : addTally(before.run, tally);
  const completes = countOf(typed) === ayatIn(surah);
  const after: SurahProgress = completes
    ? { typed: [], completions: before.completions + 1, run: NO_RUN, best: Math.max(before.best, accuracyOf(run)) }
    : { typed, completions: before.completions, run, best: before.best };
  const resume = completes
    ? positionAfter({ surah, ayah: ayatIn(surah) }, order)
    : afterTypedRange(typed, position, order);
  return { position: resume, surahs: { ...progress.surahs, [surah]: after } };
}

function afterTypedRange(typed: readonly AyahRange[], position: Position, order: SurahOrder): Position {
  const range = typed.find(([start, end]) => start <= position.ayah && position.ayah <= end);
  return positionAfter({ surah: position.surah, ayah: range?.[1] ?? position.ayah }, order);
}

function sanitizePosition(raw: unknown): Position | null {
  if (!isRecord(raw) || typeof raw.surah !== "number" || typeof raw.ayah !== "number") {
    return null;
  }
  const position = { surah: raw.surah, ayah: raw.ayah };
  return exists(position) ? position : null;
}

function sanitizeRanges(raw: unknown, surah: number): AyahRange[] {
  const ranges = (Array.isArray(raw) ? raw : []).flatMap((range: unknown): AyahRange[] => {
    const [start, end] = Array.isArray(range) ? range : [];
    const sound = isCount(start) && isCount(end) && start >= 1 && start <= end && end <= ayatIn(surah);
    return sound ? [[start, end]] : [];
  });
  const typed = merged(ranges);
  return countOf(typed) >= ayatIn(surah) ? [] : typed;
}

function sanitizeRun(raw: unknown): RunTally {
  if (!isRecord(raw) || !isCount(raw.correct) || !isCount(raw.total) || !isCount(raw.ms) || raw.correct > raw.total) {
    return NO_RUN;
  }
  return { correct: raw.correct, total: raw.total, ms: raw.ms };
}

function sanitizeBest(raw: unknown): number {
  return typeof raw === "number" && raw >= 0 && raw <= 1 ? raw : 0;
}

export function sanitizeRecitation(raw: unknown): RecitationProgress {
  if (!isRecord(raw)) {
    return initialRecitation();
  }
  const saved = isRecord(raw.surahs) ? raw.surahs : {};
  const surahs: Record<number, SurahProgress> = {};
  for (let surah = 1; surah <= SURAH_COUNT; surah += 1) {
    const entry = Object.hasOwn(saved, surah) ? saved[surah] : undefined;
    if (isRecord(entry)) {
      const typed = sanitizeRanges(entry.typed, surah);
      const completions = isCount(entry.completions) ? entry.completions : 0;
      if (typed.length > 0 || completions > 0) {
        surahs[surah] = {
          typed,
          completions,
          run: typed.length > 0 ? sanitizeRun(entry.run) : NO_RUN,
          best: sanitizeBest(entry.best),
        };
      }
    }
  }
  return { position: sanitizePosition(raw.position), surahs };
}
