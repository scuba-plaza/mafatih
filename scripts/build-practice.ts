import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hasHaraka, normalizeText, untypeableChars } from "../src/engine/normalize.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));

function parseWords(raw: string): string[] {
  const words = [];
  for (const line of raw.split("\n")) {
    const word = line.trim();
    if (word === "" || word.startsWith("#")) {
      continue;
    }
    words.push(word);
  }
  return words;
}

function assertNoQuranicPhrases(words: string[], corpusPath: string): void {
  const corpus = JSON.parse(readFileSync(corpusPath, "utf8")) as { ayat: string[] };
  const practiceText = ` ${words.join(" ")} `;
  for (const ayah of corpus.ayat) {
    const parts = ayah.split(" ");
    for (let i = 0; i + 2 < parts.length; i++) {
      const phrase = parts.slice(i, i + 3).join(" ");
      if (practiceText.includes(phrase)) {
        throw new Error(`practice corpus contains the Qur'anic phrase: ${phrase}`);
      }
    }
  }
}

const raw = parseWords(readFileSync(resolve(ROOT, "../data/practice-words.txt"), "utf8"));
const words = raw.map((word) => normalizeText(word));

if (words.length < 100) {
  throw new Error(`expected at least 100 practice words, found ${words.length}`);
}

const seen = new Set<string>();
for (const word of words) {
  if (word === "") {
    throw new Error("empty word after normalisation");
  }
  if (seen.has(word)) {
    throw new Error(`duplicate word: ${word}`);
  }
  seen.add(word);
  const bad = untypeableChars(word);
  if (bad.length > 0) {
    throw new Error(`untypeable characters in ${word}: ${bad.join(" ")}`);
  }
  if (!hasHaraka(word)) {
    throw new Error(`word is not fully vocalized: ${word}`);
  }
}

assertNoQuranicPhrases(words, resolve(ROOT, "../generated/corpus.json"));

const outPath = resolve(ROOT, "../generated/practice.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ words })}\n`);
console.log(`practice: ${words.length} words written to ${outPath}`);
