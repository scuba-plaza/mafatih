import metadata from "../../data/surahs.json";

export interface SurahMeta {
  readonly n: number;
  readonly name: string;
  readonly tname: string;
  readonly ename: string;
  readonly ayat: number;
  readonly type: string;
}

export interface Surah {
  readonly number: number;
  readonly basmala: string | null;
  readonly ayat: readonly string[];
}

const SURAHS: readonly SurahMeta[] = metadata;

export const SURAH_COUNT = SURAHS.length;

const files = import.meta.glob<{ readonly default: Surah }>("../../generated/quran/*.json");

export function surahMeta(number: number): SurahMeta | undefined {
  return SURAHS[number - 1];
}

export async function loadSurah(number: number): Promise<Surah> {
  const load = files[`../../generated/quran/${String(number).padStart(3, "0")}.json`];
  if (load === undefined) {
    throw new RangeError(`there is no surah ${number}`);
  }
  const { default: surah } = await load();
  return { number: surah.number, basmala: surah.basmala, ayat: surah.ayat };
}
