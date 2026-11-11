import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import type { PracticeWord } from "~/practice/words.ts";
import { skeleton } from "~/text/arabic.ts";
import { parseList, type Rules, selectWords, wordsOf } from "./lib/practice-rules.ts";
import { readEntries } from "./lib/wiktionary.ts";

const DATA = resolve(fileURLToPath(new URL("../data/practice", import.meta.url)));
const LIMIT = 10_000;
const STARTER_SHOWN = 400;
const SAMPLE = 100;

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

const candidates: PracticeWord[] = [];
const blocked: PracticeWord[] = [];
let entries = 0;
for await (const entry of readEntries(dumpPath)) {
  entries += 1;
  const target = rules.blocklist.has(entry.word ?? "") ? blocked : candidates;
  target.push(...wordsOf(entry, ranks));
}
const unlimited: Rules = { ...rules, limit: Number.POSITIVE_INFINITY };
const unfiltered: Rules = { blocklist: new Set(), reject: new Set(), limit: Number.POSITIVE_INFINITY };
const words = selectWords(candidates, rules);
const allowed = new Set(selectWords(candidates, unlimited).map((row) => row.word));
const removed = selectWords([...candidates, ...blocked], unfiltered).filter((row) => !allowed.has(row.word));

writeFileSync(resolve(DATA, "words.tsv"), `${words.map((row) => `${row.word}\t${row.rank}\t${row.pos}`).join("\n")}\n`);

const starter = words.filter((row) => [...skeleton(row.word)].every((letter) => HOME_ROW_LETTERS.includes(letter)));
const others = words.filter((row) => !starter.includes(row));
const step = Math.max(1, Math.floor(others.length / SAMPLE));
const sample = others.filter((_, index) => index % step === 0).slice(0, SAMPLE);
const list = (rows: readonly PracticeWord[]) => rows.map((row) => row.word).join("  ");

console.log(`entries read: ${entries}`);
console.log(`usable forms: ${candidates.length + blocked.length}`);
console.log(`removed by the blocklist or the reject list: ${removed.length}`);
console.log(`written (limit ${LIMIT}): ${words.length}, least frequent spelling has rank ${words.at(-1)?.rank}`);
console.log(
  `\nThe first ${STARTER_SHOWN} of ${starter.length} words that need only the starter letters:\n${list(starter.slice(0, STARTER_SHOWN))}`,
);
console.log(`\n${sample.length} of the other words, spread over the whole list:\n${list(sample)}`);
console.log(
  `\nRemoved words among the ${LIMIT} most frequent:\n${list(removed.filter((row) => row.rank <= (words.at(-1)?.rank ?? 0)))}`,
);
