import { skeleton } from "~/text/arabic.ts";

export interface SourceAyah {
  readonly surah: number;
  readonly ayah: number;
  readonly text: string;
}

export interface SurahData {
  readonly number: number;
  readonly basmala: string | null;
  readonly ayat: readonly string[];
}

const AYAH_LINE = /^(\d+)\|(\d+)\|(.*)$/;
const ARABIC_TEXT = /^[ء-غف-ْٰ ]+$/;
const BASMALA_WORDS = 4;
const SURAHS_WITHOUT_BASMALA = [1, 9];

function textLines(text: string): string[] {
  return text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("#"));
}

export function parseQuran(text: string): SourceAyah[] {
  return textLines(text).flatMap((line) => {
    const [, surah, ayah, words] = AYAH_LINE.exec(line) ?? [];
    return surah === undefined || ayah === undefined || words === undefined
      ? []
      : [{ surah: Number(surah), ayah: Number(ayah), text: words }];
  });
}

export function splitSurahs(ayat: readonly SourceAyah[]): SurahData[] {
  const reference = skeleton(ayat.find((ayah) => ayah.surah === 1 && ayah.ayah === 1)?.text ?? "");
  const numbers = [...new Set(ayat.map((ayah) => ayah.surah))];
  return numbers.map((number) => {
    const [first = "", ...rest] = ayat.filter((ayah) => ayah.surah === number).map((ayah) => ayah.text);
    const words = first.split(" ");
    const opening = words.slice(0, BASMALA_WORDS).join(" ");
    const lifts =
      !SURAHS_WITHOUT_BASMALA.includes(number) && words.length > BASMALA_WORDS && skeleton(opening) === reference;
    return lifts
      ? { number, basmala: opening, ayat: [words.slice(BASMALA_WORDS).join(" "), ...rest] }
      : { number, basmala: null, ayat: [first, ...rest] };
  });
}

export function sourceLinesOf(surah: SurahData): string[] {
  return surah.ayat.map((text, index) => {
    const lifted = index === 0 && surah.basmala !== null ? `${surah.basmala} ` : "";
    return `${surah.number}|${index + 1}|${lifted}${text}`;
  });
}

export function quranProblems(text: string, ayatPerSurah: ReadonlyMap<number, number>): string[] {
  const problems = textLines(text)
    .filter((line) => !AYAH_LINE.test(line))
    .map((line) => `"${line.slice(0, 40)}" is not an ayah`);
  const ayat = parseQuran(text);
  ayat.forEach(({ surah, ayah, text: words }, index) => {
    const previous = ayat[index - 1];
    const follows = previous !== undefined && surah === previous.surah && ayah === previous.ayah + 1;
    const opens = ayah === 1 && surah > (previous?.surah ?? 0);
    if (!follows && !opens) {
      problems.push(`${surah}:${ayah} is out of order`);
    }
    if (words !== words.trim() || words.includes("  ")) {
      problems.push(`${surah}:${ayah} has stray spaces`);
    }
    if (!ARABIC_TEXT.test(words)) {
      problems.push(`${surah}:${ayah} holds a character that is not Arabic text`);
    }
  });
  const surahs = new Map(splitSurahs(ayat).map((surah) => [surah.number, surah]));
  for (const [number, count] of ayatPerSurah) {
    const surah = surahs.get(number);
    if (surah === undefined) {
      problems.push(`surah ${number} is missing`);
    } else if (surah.ayat.length !== count) {
      problems.push(`surah ${number} has ${surah.ayat.length} ayat, not ${count}`);
    } else if (surah.basmala === null && !SURAHS_WITHOUT_BASMALA.includes(number)) {
      problems.push(`surah ${number} does not open with the basmala`);
    }
  }
  for (const number of surahs.keys()) {
    if (!ayatPerSurah.has(number)) {
      problems.push(`${number} is not the number of a surah`);
    }
  }
  return problems;
}
