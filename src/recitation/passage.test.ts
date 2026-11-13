import { expect, test } from "vitest";
import { isMark, skeleton } from "~/text/arabic.ts";
import { requiredMarks } from "~/text/vocalization.ts";
import { buildPassage, type Passage } from "./passage.ts";
import { loadSurah, SURAH_COUNT, type Surah } from "./quran.ts";

const NO_MARKS = requiredMarks("letters", new Set());
const ALL_MARKS = requiredMarks("full", new Set());
const DAGGER_ALEF = String.fromCodePoint(0x670);
const NO_BREAK_SPACE = String.fromCodePoint(0xa0);
const END_OF_AYAH = String.fromCodePoint(0x6dd);
const WHOLE = 1000;

const FATIHA = await loadSurah(1);
const BAQARA = await loadSurah(2);

function typed(passage: Passage): string {
  return passage.prompt.units.map((unit) => unit.text).join("");
}

function sliceOf(passage: Passage, span: { readonly start: number; readonly end: number }): string {
  return passage.prompt.shown.slice(span.start, span.end);
}

function sourceOf(surah: Surah, from: number, to: number): string {
  const ayat = surah.ayat.slice(from - 1, to);
  return (from === 1 && surah.basmala !== null ? [surah.basmala, ...ayat] : ayat).join(" ");
}

test("a passage is whole ayat in order, each followed by its end sign and number", () => {
  const passage = buildPassage(FATIHA, 1, 4, NO_MARKS);
  const sign = (number: string) => `${NO_BREAK_SPACE}${END_OF_AYAH}${number}`;
  expect(passage).toMatchObject({ surah: 1, fromAyah: 1, toAyah: 4, basmala: null });
  expect(passage.prompt.shown).toBe(
    [
      `${FATIHA.ayat[0]}${sign("١")}`,
      `${FATIHA.ayat[1]}${sign("٢")}`,
      `${FATIHA.ayat[2]}${sign("٣")}`,
      `${FATIHA.ayat[3]}${sign("٤")}`,
    ].join(" "),
  );
  expect(passage.prompt.breaks).toEqual([]);
  expect(passage.ayat.map((ayah) => ayah.ayah)).toEqual([1, 2, 3, 4]);
});

test("every ayah span is exactly the source text of that ayah, and every sign span its sign", () => {
  const passage = buildPassage(BAQARA, 280, 5, NO_MARKS);
  expect(passage.ayat.map((ayah) => sliceOf(passage, ayah))).toEqual(BAQARA.ayat.slice(279, 284));
  expect(passage.ayat.map((ayah) => sliceOf(passage, ayah.sign))).toEqual(
    ["٢٨٠", "٢٨١", "٢٨٢", "٢٨٣", "٢٨٤"].map((number) => `${END_OF_AYAH}${number}`),
  );
});

test("at the start of a surah the basmala is a block of its own, typed before the first ayah", () => {
  const passage = buildPassage(BAQARA, 1, 2, NO_MARKS);
  expect(passage.basmala).toEqual({ start: 0, end: BAQARA.basmala?.length });
  expect(sliceOf(passage, passage.basmala ?? { start: 0, end: 0 })).toBe(BAQARA.basmala);
  expect(passage.prompt.breaks).toEqual([(BAQARA.basmala?.length ?? 0) + 1]);
  expect(passage.prompt.shown.charAt(passage.prompt.breaks[0] ?? 0)).toBe("ا");
  expect(typed(passage).startsWith(`${skeleton(BAQARA.basmala ?? "")} ${skeleton("الم")} `)).toBe(true);
  expect(passage.ayat[0]).toMatchObject({ ayah: 1 });
});

test("a passage that starts later in the surah, the opening surah and surah 9 have no basmala block", async () => {
  expect(buildPassage(BAQARA, 2, 2, NO_MARKS).basmala).toBeNull();
  expect(buildPassage(BAQARA, 2, 2, NO_MARKS).prompt.breaks).toEqual([]);
  expect(buildPassage(FATIHA, 1, 7, NO_MARKS).basmala).toBeNull();
  expect(buildPassage(await loadSurah(9), 1, 3, NO_MARKS).basmala).toBeNull();
});

test("the end signs are shown and never typed; the only typed space between two ayat follows the sign", () => {
  const passage = buildPassage(FATIHA, 1, 7, ALL_MARKS);
  for (const ayah of passage.ayat) {
    const inSign = passage.prompt.units.filter((unit) => unit.start < ayah.sign.end && unit.end > ayah.end);
    expect(inSign).toEqual([]);
  }
  expect(typed(passage)).toBe(sourceOf(FATIHA, 1, 7).replaceAll(DAGGER_ALEF, ""));
  expect(typed(buildPassage(FATIHA, 1, 7, NO_MARKS))).toBe(skeleton(sourceOf(FATIHA, 1, 7)));
});

test("each ayah knows the unit that ends it, at every vocalization level", () => {
  for (const required of [NO_MARKS, ALL_MARKS, requiredMarks("harakat", new Set())]) {
    const passage = buildPassage(BAQARA, 1, 3, required);
    const { units } = passage.prompt;
    for (const ayah of passage.ayat) {
      const last = units[ayah.lastUnit];
      const next = units[ayah.lastUnit + 1];
      expect(last !== undefined && last.end <= ayah.end && last.start >= ayah.start).toBe(true);
      expect(next === undefined || next.start >= ayah.sign.end).toBe(true);
    }
    expect(passage.ayat.at(-1)?.lastUnit).toBe(units.length - 1);
  }
});

test("the dagger alef and every other mark stay on screen when only letters are typed", () => {
  const passage = buildPassage(FATIHA, 1, 7, NO_MARKS);
  expect(passage.prompt.shown.split(DAGGER_ALEF)).toHaveLength(3);
  expect([...typed(passage)].some(isMark)).toBe(false);
  expect(passage.ayat.map((ayah) => sliceOf(passage, ayah))).toEqual(FATIHA.ayat);
});

test("the passage never runs past the surah and never splits an ayah, however long", () => {
  const long = buildPassage(BAQARA, 282, 1, NO_MARKS);
  expect(long).toMatchObject({ fromAyah: 282, toAyah: 282 });
  expect(sliceOf(long, long.ayat[0] ?? { start: 0, end: 0 })).toBe(BAQARA.ayat[281]);
  expect(sliceOf(long, long.ayat[0] ?? { start: 0, end: 0 }).length).toBeGreaterThan(1100);
  expect(buildPassage(BAQARA, 285, 4, NO_MARKS)).toMatchObject({ fromAyah: 285, toAyah: 286 });
});

test("a start or a length that makes no sense is brought into range", () => {
  expect(buildPassage(FATIHA, 0, 2, NO_MARKS)).toMatchObject({ fromAyah: 1, toAyah: 2 });
  expect(buildPassage(FATIHA, 99, 2, NO_MARKS)).toMatchObject({ fromAyah: 7, toAyah: 7 });
  expect(buildPassage(FATIHA, 2.7, 0, NO_MARKS)).toMatchObject({ fromAyah: 2, toAyah: 2 });
  expect(buildPassage(FATIHA, Number.NaN, Number.NaN, NO_MARKS)).toMatchObject({ fromAyah: 1, toAyah: 1 });
  expect(buildPassage(FATIHA, 3, Number.POSITIVE_INFINITY, NO_MARKS)).toMatchObject({ fromAyah: 3, toAyah: 7 });
});

test("a surah without ayat gives an empty passage, not an ayah that does not exist", () => {
  const passage = buildPassage({ number: 5, basmala: null, ayat: [] }, 1, 4, NO_MARKS);
  expect(passage.ayat).toEqual([]);
  expect(passage.prompt.shown).toBe("");
  expect(passage.prompt.units).toEqual([]);
});

test("over all 114 surahs every ayah and every dagger alef of the source is on screen", {
  timeout: 30_000,
}, async () => {
  let ayat = 0;
  let daggerAlefs = 0;
  for (let number = 1; number <= SURAH_COUNT; number += 1) {
    const surah = await loadSurah(number);
    const passage = buildPassage(surah, 1, WHOLE, NO_MARKS);
    ayat += passage.ayat.length;
    daggerAlefs += passage.prompt.shown.split(DAGGER_ALEF).length - 1;
    expect(passage.ayat.map((ayah) => sliceOf(passage, ayah))).toEqual(surah.ayat);
    expect(typed(passage)).toBe(skeleton(sourceOf(surah, 1, WHOLE)));
  }
  expect(ayat).toBe(6236);
  expect(daggerAlefs).toBe(3330);
});
