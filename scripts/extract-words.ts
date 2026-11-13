import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import type { PracticeWord } from "~/practice/words.ts";
import { skeleton } from "~/text/arabic.ts";
import { type Candidate, parseList, type Rules, removalOf, selectWords, wordsOf } from "./lib/practice-rules.ts";
import { readEntries } from "./lib/wiktionary.ts";

const DATA = resolve(fileURLToPath(new URL("../data/practice", import.meta.url)));
const LIMIT = 10_000;
const STARTER_SHOWN = 400;
const SAMPLE = 100;
const SHARED_UNTIL_RANK = 3000;
const CASE_ENDING = /[\u064B-\u0650]\u0627?$/u;

const [dumpPath, frequencyPath] = process.argv.slice(2);
if (dumpPath === undefined || frequencyPath === undefined) {
  console.error("usage: tsx scripts/extract-words.ts <kaikki Arabic .jsonl.gz> <FrequencyWords ar_50k.txt>");
  process.exit(1);
}

function readRanks(path: string): Map<string, number> {
  const ranks = new Map<string, number>();
  readFileSync(path, "utf8")
    .split("\n")
    .forEach((line, index) => {
      const word = line.split(" ")[0] ?? "";
      if (word !== "" && !ranks.has(word)) {
        ranks.set(word, index + 1);
      }
    });
  return ranks;
}

const rules: Rules = {
  blocklist: parseList(readFileSync(resolve(DATA, "blocklist.txt"), "utf8")),
  reject: parseList(readFileSync(resolve(DATA, "reject.txt"), "utf8")),
  limit: LIMIT,
};
const ranks = readRanks(frequencyPath);

const candidates: Candidate[] = [];
let entries = 0;
for await (const entry of readEntries(dumpPath)) {
  entries += 1;
  candidates.push(...wordsOf(entry, ranks));
}
const words = selectWords(candidates, rules);
const lastRank = words.at(-1)?.rank ?? 0;
const distinct = (rows: readonly PracticeWord[]) => [...new Map(rows.map((row) => [row.word, row])).values()];
const removedBy = (list: "blocklist" | "reject") =>
  distinct(candidates.filter((candidate) => removalOf(candidate, rules) === list));
const blocked = removedBy("blocklist");
const rejected = removedBy("reject");
const found = new Set(candidates.map((candidate) => candidate.word));
const stale = [...rules.reject].filter((word) => !found.has(word));

writeFileSync(resolve(DATA, "words.tsv"), `${words.map((row) => `${row.word}\t${row.rank}`).join("\n")}\n`);

const starter = words.filter((row) => [...skeleton(row.word)].every((letter) => HOME_ROW_LETTERS.includes(letter)));
const others = words.filter((row) => !starter.includes(row));
const step = Math.max(1, Math.floor(others.length / SAMPLE));
const sample = others.filter((_, index) => index % step === 0).slice(0, SAMPLE);
const sharedSpellings = new Map<string, PracticeWord[]>();
for (const row of words.filter((word) => word.rank <= SHARED_UNTIL_RANK)) {
  sharedSpellings.set(skeleton(row.word), [...(sharedSpellings.get(skeleton(row.word)) ?? []), row]);
}
const list = (rows: readonly PracticeWord[]) => rows.map((row) => row.word).join("  ");
const frequent = (rows: readonly PracticeWord[]) => rows.filter((row) => row.rank <= lastRank);

console.log(`entries read: ${entries}`);
console.log(`usable forms: ${candidates.length}, distinct words: ${found.size}`);
console.log(`removed by the blocklist: ${blocked.length} (${frequent(blocked).length} among the frequent ones)`);
console.log(`removed by the reject list: ${rejected.length}`);
console.log(`written (limit ${LIMIT}): ${words.length}, least frequent spelling has rank ${lastRank}`);
console.log(`\nReject list lines that match no word any more:\n${stale.join("  ")}`);
console.log(
  `\nThe first ${STARTER_SHOWN} of ${starter.length} words that need only the starter letters:\n${list(starter.slice(0, STARTER_SHOWN))}`,
);
console.log(`\n${sample.length} of the other words, spread over the whole list:\n${list(sample)}`);
console.log(`\nSpellings up to rank ${SHARED_UNTIL_RANK} that are read in more than one way:`);
for (const [spelling, rows] of sharedSpellings) {
  const readings = new Set(rows.map((row) => row.word.replace(CASE_ENDING, "")));
  if (readings.size > 1) {
    console.log(`${spelling} (${rows[0]?.rank}): ${list(rows)}`);
  }
}
console.log(`\nRemoved by the blocklist, among the frequent words:\n${list(frequent(blocked))}`);
console.log(`\nRemoved by the reject list:\n${list(rejected)}`);
