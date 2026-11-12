import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import { LADDER } from "~/practice/ladder.ts";
import { parseWordList } from "~/practice/words.ts";
import { skeleton } from "~/text/arabic.ts";
import { coverageOf, parseList, type Rules, violationsOf } from "./lib/practice-rules.ts";
import { isTanzilText, noticeOf, parseQuran, quranProblems, sourceLinesOf, splitSurahs } from "./lib/quran-rules.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const PRACTICE = resolve(ROOT, "data/practice");
const QURAN_SOURCE = resolve(ROOT, "data/quran-simple.txt");
const QURAN_OUTPUT = resolve(ROOT, "generated/quran");
const AYAT = 6236;
const SURAHS = 114;
const DAGGER_ALEFS = 3330;
const DAGGER_ALEF = "\u0670";
const MAX_WORDS = 12_000;
const MAX_BYTES = 300_000;
const MIN_STARTER_WORDS = 60;
const MIN_STARTER_SPELLINGS = 60;
const MIN_WORDS_PER_STARTER_LETTER = 8;
const MIN_WORDS_PER_MARK = 50;
const MIN_SPELLINGS_PER_RUNG = 10;

function read(name: string): string {
  return readFileSync(resolve(PRACTICE, name), "utf8");
}

function practiceProblems(): string[] {
  const text = read("words.tsv");
  const rows = parseWordList(text);
  const rules: Rules = {
    blocklist: parseList(read("blocklist.txt")),
    reject: parseList(read("reject.txt")),
    limit: MAX_WORDS,
  };
  const coverage = coverageOf(rows, HOME_ROW_LETTERS);
  const problems = violationsOf(rows, rules);
  const check = (holds: boolean, problem: string) => {
    if (!holds) {
      problems.push(problem);
    }
  };
  check(Buffer.byteLength(text) <= MAX_BYTES, `words.tsv is larger than ${MAX_BYTES} bytes`);
  check(
    coverage.starterWords >= MIN_STARTER_WORDS,
    `only ${coverage.starterWords} words use the starter letters alone`,
  );
  check(
    coverage.starterSpellings >= MIN_STARTER_SPELLINGS,
    `only ${coverage.starterSpellings} spellings use the starter letters alone`,
  );
  for (const [letter, count] of coverage.wordsPerStarterLetter) {
    check(count >= MIN_WORDS_PER_STARTER_LETTER, `only ${count} starter words contain ${letter}`);
  }
  for (const [mark, count] of coverage.wordsPerMark) {
    check(count >= MIN_WORDS_PER_MARK, `only ${count} words contain the mark U+${mark.codePointAt(0)?.toString(16)}`);
  }
  check(coverage.wordsWithoutMarks === 0, `${coverage.wordsWithoutMarks} words have no mark to type`);
  check(/^([^\t\n]+\t[1-9]\d*\n)+$/.test(text), "words.tsv has a line that is not a word, a tab and a rank");
  const spellings = [...new Set(rows.map((row) => skeleton(row.word)))];
  const letters = LADDER.rungs.filter((rung) => rung.kind === "letter").map((rung) => rung.char);
  letters.forEach((letter, index) => {
    const reached = letters.slice(0, Math.max(index + 1, LADDER.starter));
    const drills = spellings.filter(
      (spelling) => spelling.includes(letter) && [...spelling].every((each) => reached.includes(each)),
    );
    check(
      drills.length >= MIN_SPELLINGS_PER_RUNG,
      `only ${drills.length} spellings can drill ${letter} when it unlocks`,
    );
  });
  console.log(
    `practice words: ${rows.length}, ${coverage.starterWords} from the starter letters (${coverage.starterSpellings} spellings)`,
  );
  return problems;
}

interface SurahMeta {
  readonly n: number;
  readonly ayat: number;
}

function quranBuildProblems(): string[] {
  rmSync(QURAN_OUTPUT, { recursive: true, force: true });
  const bytes = readFileSync(QURAN_SOURCE);
  const text = bytes.toString("utf8");
  const meta: readonly SurahMeta[] = JSON.parse(readFileSync(resolve(ROOT, "data/surahs.json"), "utf8"));
  const problems = quranProblems(text, new Map(meta.map((surah) => [surah.n, surah.ayat])));
  const check = (holds: boolean, problem: string) => {
    if (!holds) {
      problems.push(problem);
    }
  };
  const ayat = parseQuran(text);
  const surahs = splitSurahs(ayat);
  const rejoined = surahs.flatMap(sourceLinesOf);
  const written = surahs.flatMap((surah) => [surah.basmala ?? "", ...surah.ayat]).join("");
  check(
    isTanzilText(bytes),
    "data/quran-simple.txt is not the Tanzil text it is meant to be: not one character of it may change",
  );
  check(meta.length === SURAHS && surahs.length === SURAHS, `there are ${surahs.length} surahs, not ${SURAHS}`);
  check(ayat.length === AYAT, `there are ${ayat.length} ayat, not ${AYAT}`);
  check(
    rejoined.join("\n") === ayat.map((ayah) => `${ayah.surah}|${ayah.ayah}|${ayah.text}`).join("\n"),
    "the built surahs do not give back the source text",
  );
  check(
    written.split(DAGGER_ALEF).length - 1 === DAGGER_ALEFS,
    `the built surahs hold ${written.split(DAGGER_ALEF).length - 1} dagger alefs, not ${DAGGER_ALEFS}`,
  );
  if (problems.length === 0) {
    const source = noticeOf(text);
    mkdirSync(QURAN_OUTPUT, { recursive: true });
    for (const surah of surahs) {
      const name = `${String(surah.number).padStart(3, "0")}.json`;
      writeFileSync(resolve(QURAN_OUTPUT, name), `${JSON.stringify({ ...surah, source })}\n`);
    }
    console.log(`quran: ${surahs.length} surahs, ${ayat.length} ayat`);
  }
  return problems;
}

const problems = [...practiceProblems(), ...quranBuildProblems()];
if (problems.length > 0) {
  console.error(`build:data found problems in the committed data:\n${problems.slice(0, 40).join("\n")}`);
  process.exit(1);
}
