import { expect, test } from "vitest";
import { loadSurah, SURAH_COUNT, surahMeta } from "./quran.ts";

const BASMALA =
  "\u0628\u0650\u0633\u0652\u0645\u0650 \u0627\u0644\u0644\u0651\u064E\u0647\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0652\u0645\u064E\u0670\u0646\u0650 \u0627\u0644\u0631\u0651\u064E\u062D\u0650\u064A\u0645\u0650";
const LAST_OF_FATIHA =
  "\u0635\u0650\u0631\u064E\u0627\u0637\u064E \u0627\u0644\u0651\u064E\u0630\u0650\u064A\u0646\u064E \u0623\u064E\u0646\u0652\u0639\u064E\u0645\u0652\u062A\u064E \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u063A\u064E\u064A\u0652\u0631\u0650 \u0627\u0644\u0652\u0645\u064E\u063A\u0652\u0636\u064F\u0648\u0628\u0650 \u0639\u064E\u0644\u064E\u064A\u0652\u0647\u0650\u0645\u0652 \u0648\u064E\u0644\u064E\u0627 \u0627\u0644\u0636\u0651\u064E\u0627\u0644\u0651\u0650\u064A\u0646\u064E";

test("there are 114 surahs with 6,236 ayat, each with its names", () => {
  const all = Array.from({ length: SURAH_COUNT }, (_, index) => surahMeta(index + 1));
  expect(SURAH_COUNT).toBe(114);
  expect(all.reduce((sum, surah) => sum + (surah?.ayat ?? 0), 0)).toBe(6236);
  expect(surahMeta(1)).toEqual({
    n: 1,
    name: "الفاتحة",
    tname: "Al-Faatiha",
    ename: "The Opening",
    ayat: 7,
    type: "meccan",
  });
  expect(surahMeta(114)?.name).toBe("الناس");
});

test("a number that is not a surah has no entry", () => {
  for (const number of [0, 115, -1, 1.5, Number.NaN]) {
    expect(surahMeta(number)).toBeUndefined();
  }
});

test("the opening surah has the basmala as its first ayah", async () => {
  const fatiha = await loadSurah(1);
  expect(fatiha.number).toBe(1);
  expect(fatiha.basmala).toBeNull();
  expect(fatiha.ayat).toHaveLength(7);
  expect(fatiha.ayat[0]).toBe(BASMALA);
  expect(fatiha.ayat[6]).toBe(LAST_OF_FATIHA);
});

test("other surahs carry the basmala apart from their first ayah, and surah 9 has none", async () => {
  const baqara = await loadSurah(2);
  const tawba = await loadSurah(9);
  expect(baqara.basmala).toBe(BASMALA);
  expect(baqara.ayat[0]).toBe("الم");
  expect(baqara.ayat).toHaveLength(286);
  expect(tawba.basmala).toBeNull();
  expect(tawba.ayat[0]?.startsWith("\u0628\u064E\u0631\u064E\u0627\u0621\u064E\u0629\u064C")).toBe(true);
});

test("every surah loads with as many ayat as its entry says", async () => {
  for (let number = 1; number <= SURAH_COUNT; number += 1) {
    const surah = await loadSurah(number);
    expect(surah.ayat.length, String(number)).toBe(surahMeta(number)?.ayat);
    expect(surah.basmala === null, String(number)).toBe(number === 1 || number === 9);
  }
});

test("loading a number that is not a surah fails", async () => {
  await expect(loadSurah(0)).rejects.toThrow(RangeError);
  await expect(loadSurah(115)).rejects.toThrow(RangeError);
});
