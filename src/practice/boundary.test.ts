import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const FORBIDDEN = /recitation|qur.?an|tanzil|surah/i;
const RELATIVE_SOURCE = /["'`](\.{1,2}\/[^"'`]+\.tsx?)["'`]/g;
const PRACTICE = new URL("./", import.meta.url);
const EXTRACTION = new URL("../../scripts/extract-words.ts", import.meta.url);

function practiceSources(): URL[] {
  return readdirSync(PRACTICE, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name) && !entry.name.includes(".test."))
    .map((entry) => new URL(entry.name, `file://${entry.parentPath}/`));
}

function withNeighbours(file: URL, texts: Map<string, string>): Map<string, string> {
  if (!texts.has(file.pathname)) {
    const text = readFileSync(file, "utf8");
    texts.set(file.pathname, text);
    for (const [, path = ""] of text.matchAll(RELATIVE_SOURCE)) {
      withNeighbours(new URL(path, file), texts);
    }
  }
  return texts;
}

function scanned(): Map<string, string> {
  return [...practiceSources(), EXTRACTION].reduce((texts, file) => withNeighbours(file, texts), new Map());
}

test("Practice's own files and the pipeline behind its word list never name the Qur'an or recitation, in an import or anywhere else", () => {
  for (const [path, text] of scanned()) {
    expect(text.match(FORBIDDEN)?.[0], path).toBeUndefined();
  }
});

test("the check reads Practice, the extraction script and the files they import by a relative path; the ~/ alias is not followed", () => {
  const names = [...scanned().keys()].map((path) => path.slice(path.lastIndexOf("/") + 1)).sort();
  expect(names).toEqual(
    [
      "Hud.tsx",
      "PracticePage.tsx",
      "extract-words.ts",
      "ladder.ts",
      "lesson.ts",
      "outcome.ts",
      "practice-rules.ts",
      "wiktionary.ts",
      "words.ts",
    ].sort(),
  );
});

test("a mention is found however the data is reached", () => {
  const mentions = [
    'import("~/recitation/passage.ts")',
    "import(`../../generated/quran/001.json`)",
    'import.meta.glob("../../generated/quran/*.json")',
    'require("../recitation/quran.ts")',
    'fetch(new URL("../../data/tanzil/quran-simple.txt", import.meta.url))',
    'import { surahMeta } from "~/lib/meta.ts"',
    "const text = quranText",
  ];
  for (const mention of mentions) {
    expect(FORBIDDEN.test(mention), mention).toBe(true);
  }
});
