import { SURAH_COUNT } from "./quran.ts";

export const SURAH_ORDERS = ["mushaf", "juz-amma"] as const;

export type SurahOrder = (typeof SURAH_ORDERS)[number];

const JUZ_AMMA_FIRST = 78;

const MUSHAF: readonly number[] = Array.from({ length: SURAH_COUNT }, (_, index) => index + 1);
const JUZ_AMMA: readonly number[] = [
  ...MUSHAF.filter((surah) => surah >= JUZ_AMMA_FIRST).reverse(),
  ...MUSHAF.filter((surah) => surah < JUZ_AMMA_FIRST),
];

export function surahOrder(order: SurahOrder): readonly number[] {
  return order === "juz-amma" ? JUZ_AMMA : MUSHAF;
}
