import { skeleton, stripToTier } from "~/engine/corpus/normalize.ts";
import artifact from "~generated/corpus.json" with { type: "json" };

export interface Surah {
  n: number;
  name: string;
  tname: string;
  ename: string;
  ayatCount: number;
  type: string;
}

export interface Ayah {
  surah: number;
  ayah: number;
  text: string;
}

export interface WordEntry {
  text: string;
  freq: number;
  lo: number;
  hi: number;
}

type RawSurah = [number, string, string, string, number, string];

interface Artifact {
  letterOrder: string[];
  surahs: RawSurah[];
  ayat: string[];
}

const data = artifact as unknown as Artifact;

export const letterOrder: readonly string[] = data.letterOrder;

export const letterIndex: ReadonlyMap<string, number> = new Map(letterOrder.map((letter, i) => [letter, i]));

export const surahs: readonly Surah[] = data.surahs.map(([n, name, tname, ename, ayatCount, type]) => ({
  n,
  name,
  tname,
  ename,
  ayatCount,
  type,
}));

function expand(texts: readonly string[], meta: readonly Surah[]): Ayah[] {
  const out: Ayah[] = [];
  let index = 0;
  for (const surah of meta) {
    for (let ayah = 1; ayah <= surah.ayatCount; ayah += 1) {
      const text = texts[index];
      if (text === undefined) {
        return out;
      }
      out.push({ surah: surah.n, ayah, text });
      index += 1;
    }
  }
  return out;
}

export const ayat: readonly Ayah[] = expand(data.ayat, surahs);

function ayahOffsets(meta: readonly Surah[]): number[] {
  const offsets: number[] = [];
  let total = 0;
  for (const surah of meta) {
    offsets.push(total);
    total += surah.ayatCount;
  }
  return offsets;
}

const firstAyahIndex: readonly number[] = ayahOffsets(surahs);

export function surahByNumber(n: number): Surah | undefined {
  return surahs[n - 1];
}

export function ayatOfSurah(n: number): Ayah[] {
  const surah = surahByNumber(n);
  const start = firstAyahIndex[n - 1];
  if (surah === undefined || start === undefined) {
    return [];
  }
  return ayat.slice(start, start + surah.ayatCount);
}

export const BASMALA_TEXT: string = ayat.find((a) => a.surah === 1 && a.ayah === 1)?.text ?? "";

export const BASMALA: string = stripToTier(BASMALA_TEXT, "none");

export function startsWithBasmala(text: string): boolean {
  if (BASMALA.length === 0) {
    return false;
  }
  const bare = stripToTier(text, "none");
  return bare === BASMALA || bare.startsWith(`${BASMALA} `);
}

export function opensWithBasmala(text: string): boolean {
  return BASMALA.length > 0 && stripToTier(text, "none").startsWith(`${BASMALA} `);
}

export interface Mask {
  lo: number;
  hi: number;
}

function maskOfWord(word: string): Mask {
  let lo = 0;
  let hi = 0;
  for (const letter of skeleton(word)) {
    const i = letterIndex.get(letter);
    if (i === undefined) {
      continue;
    }
    if (i < 32) {
      lo |= 1 << i;
    } else {
      hi |= 1 << (i - 32);
    }
  }
  return { lo, hi };
}

export function maskOfFirst(count: number): Mask {
  const n = Math.max(0, Math.min(count, letterOrder.length));
  const lo = n >= 32 ? ~0 : (1 << n) - 1;
  const hi = n <= 32 ? 0 : (1 << (n - 32)) - 1;
  return { lo, hi };
}

export function fits(word: Mask, unlocked: Mask): boolean {
  return (word.lo & ~unlocked.lo) === 0 && (word.hi & ~unlocked.hi) === 0;
}

let wordCache: WordEntry[] | null = null;

export function words(): readonly WordEntry[] {
  if (wordCache !== null) {
    return wordCache;
  }
  const freq = new Map<string, number>();
  for (const { text } of ayat) {
    for (const word of text.split(" ")) {
      if (word.length > 0) {
        freq.set(word, (freq.get(word) ?? 0) + 1);
      }
    }
  }
  wordCache = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([text, count]) => {
      const { lo, hi } = maskOfWord(text);
      return { text, freq: count, lo, hi };
    });
  return wordCache;
}
