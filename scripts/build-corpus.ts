import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeText, untypeableChars } from "../src/engine/normalize.ts";

const ROOT = dirname(fileURLToPath(import.meta.url));

interface SurahMeta {
  n: number;
  name: string;
  tname: string;
  ename: string;
  ayat: number;
  type: string;
}

interface Corpus {
  surahs: SurahMeta[];
  ayat: string[];
}

function parseSource(raw: string): { surah: number; ayah: number; text: string }[] {
  const records = [];
  for (const line of raw.split("\n")) {
    if (line.trim() === "" || line.startsWith("#")) {
      continue;
    }
    const [surah, ayah, ...rest] = line.split("|");
    const text = rest.join("|");
    if (text === undefined || text.trim() === "") {
      throw new Error(`malformed line: ${line}`);
    }
    records.push({ surah: Number(surah), ayah: Number(ayah), text });
  }
  return records;
}

function build(): Corpus {
  const surahs: SurahMeta[] = JSON.parse(readFileSync(resolve(ROOT, "../data/surahs.json"), "utf8"));
  const records = parseSource(readFileSync(resolve(ROOT, "../data/quran-simple.txt"), "utf8"));

  if (records.length !== 6236) {
    throw new Error(`expected 6236 ayat, found ${records.length}`);
  }

  const expected = new Map(surahs.map((surah) => [surah.n, surah.ayat]));
  if ([...expected.values()].reduce((a, b) => a + b, 0) !== records.length) {
    throw new Error("surah metadata does not account for every ayah");
  }

  const counts = new Map<number, number>();
  const ayat: string[] = [];
  let currentSurah = 0;
  let expectedAyah = 1;
  for (const record of records) {
    if (record.surah !== currentSurah) {
      currentSurah = record.surah;
      expectedAyah = 1;
    }
    if (record.ayah !== expectedAyah) {
      throw new Error(`surah ${record.surah}: expected ayah ${expectedAyah}, found ${record.ayah}`);
    }
    const text = normalizeText(record.text);
    const bad = untypeableChars(text);
    if (bad.length > 0) {
      throw new Error(`surah ${record.surah} ayah ${record.ayah}: untypeable ${bad.join(" ")}`);
    }
    if (text === "") {
      throw new Error(`surah ${record.surah} ayah ${record.ayah}: empty after normalisation`);
    }
    counts.set(record.surah, (counts.get(record.surah) ?? 0) + 1);
    ayat.push(text);
    expectedAyah++;
  }
  for (const surah of surahs) {
    if (counts.get(surah.n) !== surah.ayat) {
      throw new Error(`surah ${surah.n}: metadata says ${surah.ayat} ayat, found ${counts.get(surah.n)}`);
    }
  }
  return { surahs, ayat };
}

const corpus = build();
const outPath = resolve(ROOT, "../generated/corpus.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(corpus)}\n`);
console.log(`corpus: ${corpus.ayat.length} ayat written to ${outPath}`);
