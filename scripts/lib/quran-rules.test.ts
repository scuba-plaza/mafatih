import { expect, test } from "vitest";
import { parseQuran, quranProblems, sourceLinesOf, splitSurahs } from "./quran-rules.ts";

const BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
const BEH = String.fromCodePoint(0x628);
const SOURCE = [
  `1|1|${BASMALA}`,
  "1|2|الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
  `2|1|${BASMALA} الم`,
  "2|2|ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ",
  "9|1|بَرَاءَةٌ مِّنَ اللَّهِ وَرَسُولِهِ",
  "",
  "# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK",
  "#  Tanzil Quran Text",
  "",
].join("\n");
const COUNTS = new Map([
  [1, 2],
  [2, 2],
  [9, 1],
]);

test("each line of the source is one ayah; blank lines and the copyright block are not ayat", () => {
  const ayat = parseQuran(SOURCE);
  expect(ayat).toHaveLength(5);
  expect(ayat[0]).toEqual({ surah: 1, ayah: 1, text: BASMALA });
  expect(ayat[4]).toEqual({ surah: 9, ayah: 1, text: "بَرَاءَةٌ مِّنَ اللَّهِ وَرَسُولِهِ" });
});

test("the basmala that the source puts before the first ayah is lifted out, word for word", () => {
  const [fatiha, baqara, tawba] = splitSurahs(parseQuran(SOURCE));
  expect(fatiha).toEqual({ number: 1, basmala: null, ayat: [BASMALA, "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ"] });
  expect(baqara).toEqual({ number: 2, basmala: BASMALA, ayat: ["الم", "ذَٰلِكَ الْكِتَابُ لَا رَيْبَ فِيهِ"] });
  expect(tawba).toEqual({ number: 9, basmala: null, ayat: ["بَرَاءَةٌ مِّنَ اللَّهِ وَرَسُولِهِ"] });
});

test("a basmala written with other marks, as before surahs 95 and 97, is kept as the source has it", () => {
  const marked = BASMALA.replace(BEH, `${BEH}${String.fromCodePoint(0x651)}`);
  const [, surah] = splitSurahs(parseQuran(`1|1|${BASMALA}\n95|1|${marked} وَالتِّينِ وَالزَّيْتُونِ`));
  expect(marked).not.toBe(BASMALA);
  expect(surah).toEqual({ number: 95, basmala: marked, ayat: ["وَالتِّينِ وَالزَّيْتُونِ"] });
});

test("joining the basmala and the ayat again gives back the source lines", () => {
  const surahs = splitSurahs(parseQuran(SOURCE));
  expect(surahs.flatMap(sourceLinesOf).join("\n")).toBe(SOURCE.split("\n").slice(0, 5).join("\n"));
});

test("sound text has no problems", () => {
  expect(quranProblems(SOURCE, COUNTS)).toEqual([]);
});

test("a missing, extra, misnumbered or malformed ayah is reported", () => {
  const lines = SOURCE.split("\n");
  const without = (index: number) => lines.filter((_, at) => at !== index).join("\n");
  const report = (text: string) => quranProblems(text, COUNTS).join("\n");
  expect(report(without(1))).toMatch(/surah 1 has 1 ayat, not 2/);
  expect(report(`${SOURCE}\n9|2|نص`)).toMatch(/surah 9 has 2 ayat, not 1/);
  expect(report(SOURCE.replace("2|2|", "2|3|"))).toMatch(/2:3 is out of order/);
  expect(report(SOURCE.replace("9|1|", "10|1|"))).toMatch(/surah 9 is missing/);
  expect(report(`${SOURCE}\nnot an ayah`)).toMatch(/not an ayah/);
  expect(report(SOURCE.replace("2|2|ذَٰلِكَ", "2|2| ذَٰلِكَ"))).toMatch(/2:2 has stray spaces/);
  expect(report(SOURCE.replace("الم", "ال م x"))).toMatch(/2:1 holds a character that is not Arabic text/);
});

test("a surah that should open with the basmala and does not is reported", () => {
  expect(quranProblems(SOURCE.replace(`2|1|${BASMALA} الم`, "2|1|الم"), COUNTS).join("\n")).toMatch(
    /surah 2 does not open with the basmala/,
  );
});
