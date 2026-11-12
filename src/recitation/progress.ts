import { isRecord } from "~/lib/guards.ts";
import { type SurahOrder, surahOrder } from "./order.ts";
import { SURAH_COUNT, surahMeta } from "./quran.ts";

export interface Position {
  readonly surah: number;
  readonly ayah: number;
}

export type AyahRange = readonly [number, number];

export interface SurahProgress {
  readonly typed: readonly AyahRange[];
  readonly completions: number;
}

export interface RecitationProgress {
  readonly position: Position | null;
  readonly surahs: Readonly<Record<number, SurahProgress>>;
}

export interface SurahCompletion {
  readonly surah: number;
  readonly completions: number;
}

const NOT_STARTED: SurahProgress = { typed: [], completions: 0 };

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

export function resumeOf(progress: RecitationProgress, surah: number): number {
  const [first] = recordOf(progress, surah).typed;
  return first === undefined || first[0] > 1 ? 1 : first[1] + 1;
}

export function positionAfter(position: Position, order: SurahOrder): Position {
  return position.ayah < ayatIn(position.surah)
    ? { surah: position.surah, ayah: position.ayah + 1 }
    : { surah: neighbour(position.surah, order, 1), ayah: 1 };
}

export function passageBefore(position: Position, maxAyat: number, order: SurahOrder): Position {
  const size = Math.max(1, Math.floor(maxAyat) || 1);
  if (position.ayah > 1) {
    return { surah: position.surah, ayah: Math.max(1, position.ayah - size) };
  }
  const surah = neighbour(position.surah, order, -1);
  return { surah, ayah: 1 + Math.floor((ayatIn(surah) - 1) / size) * size };
}

export function recordAyah(
  progress: RecitationProgress,
  position: Position,
  order: SurahOrder,
): { readonly progress: RecitationProgress; readonly completion: SurahCompletion | null } {
  if (!exists(position)) {
    return { progress, completion: null };
  }
  const { surah, ayah } = position;
  const before = recordOf(progress, surah);
  const typed = merged([...before.typed, [ayah, ayah]]);
  const completes = countOf(typed) === ayatIn(surah);
  const after: SurahProgress = completes
    ? { typed: [], completions: before.completions + 1 }
    : { typed, completions: before.completions };
  const resume = completes ? positionAfter({ surah, ayah: ayatIn(surah) }, order) : nextMissing(typed, position, order);
  return {
    progress: { position: resume, surahs: { ...progress.surahs, [surah]: after } },
    completion: completes ? { surah, completions: after.completions } : null,
  };
}

function nextMissing(typed: readonly AyahRange[], position: Position, order: SurahOrder): Position {
  const range = typed.find(([start, end]) => start <= position.ayah && position.ayah <= end);
  return positionAfter({ surah: position.surah, ayah: range?.[1] ?? position.ayah }, order);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
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
        surahs[surah] = { typed, completions };
      }
    }
  }
  return { position: sanitizePosition(raw.position), surahs };
}
