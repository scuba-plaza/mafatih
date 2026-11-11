import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import { parseWordList } from "~/practice/words.ts";
import { coverageOf, parseList, type Rules, violationsOf } from "./lib/practice-rules.ts";

const PRACTICE = resolve(fileURLToPath(new URL("../data/practice", import.meta.url)));
const MAX_WORDS = 12_000;
const MAX_BYTES = 300_000;
const MIN_STARTER_WORDS = 60;
const MIN_STARTER_SPELLINGS = 60;
const MIN_WORDS_PER_STARTER_LETTER = 8;
const MIN_WORDS_PER_MARK = 50;

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
  const require = (holds: boolean, problem: string) => {
    if (!holds) {
      problems.push(problem);
    }
  };
  require(Buffer.byteLength(text) <= MAX_BYTES, `words.tsv is larger than ${MAX_BYTES} bytes`);
  require(coverage.starterWords >=
    MIN_STARTER_WORDS, `only ${coverage.starterWords} words use the starter letters alone`);
  require(coverage.starterSpellings >=
    MIN_STARTER_SPELLINGS, `only ${coverage.starterSpellings} spellings use the starter letters alone`);
  for (const [letter, count] of coverage.wordsPerStarterLetter) {
    require(count >= MIN_WORDS_PER_STARTER_LETTER, `only ${count} starter words contain ${letter}`);
  }
  for (const [mark, count] of coverage.wordsPerMark) {
    require(count >= MIN_WORDS_PER_MARK, `only ${count} words contain the mark U+${mark.codePointAt(0)?.toString(16)}`);
  }
  require(coverage.wordsWithoutMarks === 0, `${coverage.wordsWithoutMarks} words have no mark to type`);
  console.log(
    `practice words: ${rows.length}, ${coverage.starterWords} from the starter letters (${coverage.starterSpellings} spellings)`,
  );
  return problems;
}

const problems = practiceProblems();
if (problems.length > 0) {
  console.error(`build:data found problems in the committed data:\n${problems.slice(0, 40).join("\n")}`);
  process.exit(1);
}
