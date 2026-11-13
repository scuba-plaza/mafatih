import { readFileSync } from "node:fs";

export interface SurahFile {
  readonly number: number;
  readonly basmala: string | null;
  readonly ayat: readonly string[];
  readonly source: string;
}

const MARKS = /[ً-ْٰ]/g;
const NO_BREAK_SPACE = " ";
const END_OF_AYAH = "۝";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export function surah(number: number): SurahFile {
  const name = `${String(number).padStart(3, "0")}.json`;
  return JSON.parse(readFileSync(new URL(`../../generated/quran/${name}`, import.meta.url), "utf8"));
}

export function sign(ayah: number): string {
  return `${END_OF_AYAH}${[...String(ayah)].map((digit) => ARABIC_DIGITS.charAt(Number(digit))).join("")}`;
}

export function shownAyat(source: SurahFile, from: number, to: number): string {
  return source.ayat
    .slice(from - 1, to)
    .map((text, index) => `${text}${NO_BREAK_SPACE}${sign(from + index)}`)
    .join(" ");
}

export function lettersOf(source: SurahFile, from: number, to: number, withBasmala = false): string[] {
  const opening = withBasmala && source.basmala !== null ? [source.basmala] : [];
  return [...[...opening, ...source.ayat.slice(from - 1, to)].join(" ").replace(MARKS, "")];
}
