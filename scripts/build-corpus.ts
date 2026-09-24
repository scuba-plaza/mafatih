import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeText, skeleton, untypeableChars } from "../src/engine/corpus/normalize.ts";
import { reachOf } from "../src/engine/layout/ara.ts";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_AYAT = 6236;
const EXPECTED_SURAHS = 114;

interface RawAyah {
  s: number;
  a: number;
  t: string;
}

interface SurahMeta {
  n: number;
  name: string;
  tname: string;
  ename: string;
  ayat: number;
  type: string;
}

function parseAyat(raw: string): RawAyah[] {
  const out: RawAyah[] = [];
  for (const line of raw.split("\n")) {
    if (!line || line.startsWith("#")) {
      continue;
    }
    const parts = line.split("|");
    if (parts.length < 3) {
      continue;
    }
    const [s, a, t] = parts;
    if (s === undefined || a === undefined || t === undefined) {
      continue;
    }
    out.push({ s: Number(s), a: Number(a), t: normalizeText(t) });
  }
  return out;
}

function buildLetterOrder(words: Map<string, number>): string[] {
  const weight = new Map<string, number>();
  for (const [word, freq] of words) {
    for (const letter of new Set(skeleton(word))) {
      if (letter === " ") {
        continue;
      }
      weight.set(letter, (weight.get(letter) ?? 0) + freq);
    }
  }
  const score = (letter: string, count: number): number => count * Math.exp(-reachOf(letter));
  return [...weight.entries()]
    .sort((a, b) => score(b[0], b[1]) - score(a[0], a[1]) || a[0].localeCompare(b[0]))
    .map(([letter]) => letter);
}

function assertIndexed(word: string, index: ReadonlyMap<string, number>): void {
  for (const letter of skeleton(word)) {
    if (!index.has(letter)) {
      throw new Error(`letter outside index: ${JSON.stringify(letter)} in ${word}`);
    }
  }
}

const rawText = readFileSync(resolve(ROOT, "data/quran-simple.txt"), "utf8");
const surahs = JSON.parse(readFileSync(resolve(ROOT, "data/surahs.json"), "utf8")) as SurahMeta[];
const ayat = parseAyat(rawText);

if (ayat.length !== EXPECTED_AYAT) {
  throw new Error(`expected ${EXPECTED_AYAT} ayat, parsed ${ayat.length}`);
}
const declared = surahs.reduce((sum, s) => sum + s.ayat, 0);
if (declared !== ayat.length) {
  throw new Error(`surah metadata declares ${declared} ayat, the text has ${ayat.length}`);
}
ayat.forEach((verse, index) => {
  if (index > 0 && verse.a !== 1 && verse.a !== (ayat[index - 1]?.a ?? 0) + 1) {
    throw new Error(`ayat are not in surah order at ${verse.s}:${verse.a}`);
  }
});
if (surahs.length !== EXPECTED_SURAHS) {
  throw new Error(`expected ${EXPECTED_SURAHS} surahs, parsed ${surahs.length}`);
}

const offenders = new Set<string>();
for (const { t } of ayat) {
  for (const bad of untypeableChars(t)) {
    offenders.add(bad);
  }
}
if (offenders.size > 0) {
  const listed = [...offenders].map((c) => `U+${c.codePointAt(0)?.toString(16).toUpperCase().padStart(4, "0")}`);
  throw new Error(`corpus contains untypeable characters: ${listed.join(", ")}`);
}
if (rawText.includes("ٰ") && ayat.some(({ t }) => t.includes("ٰ"))) {
  throw new Error("dagger alef U+0670 survived normalisation");
}

const wordFreq = new Map<string, number>();
for (const { t } of ayat) {
  for (const word of t.split(" ")) {
    if (word.length > 0) {
      wordFreq.set(word, (wordFreq.get(word) ?? 0) + 1);
    }
  }
}

const letterOrder = buildLetterOrder(wordFreq);
const letterIndex = new Map(letterOrder.map((letter, i) => [letter, i]));
if (letterOrder.length > 64) {
  throw new Error(`letter order exceeds 64-bit mask capacity: ${letterOrder.length}`);
}

for (const word of wordFreq.keys()) {
  assertIndexed(word, letterIndex);
}

const artifact = {
  _note: "GENERATED FILE - do not edit. Derived from data/quran-simple.txt by scripts/build-corpus.ts.",
  _source: "Tanzil Quran Text (Simple, Version 1.1) - Copyright (C) 2007-2026 Tanzil Project",
  _license: "Creative Commons Attribution 3.0 - https://tanzil.net",
  _derivation:
    "NFC normalised, ligatures decomposed, filtered to the characters the Arabic (101) keyboard layout can produce.",
  letterOrder,
  surahs: surahs.map((s) => [s.n, s.name, s.tname, s.ename, s.ayat, s.type]),
  ayat: ayat.map(({ t }) => t),
};

const outPath = resolve(ROOT, "generated/corpus.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(artifact));

const chars = ayat.reduce((sum, { t }) => sum + [...t].length, 0);
console.log(`ayat        ${ayat.length}`);
console.log(`surahs      ${surahs.length}`);
console.log(`words       ${wordFreq.size} distinct (derived at runtime)`);
console.log(`letters     ${letterOrder.length} -> ${letterOrder.join(" ")}`);
console.log(`characters  ${chars}`);
console.log(`untypeable  0`);
console.log(`written     generated/corpus.json`);
