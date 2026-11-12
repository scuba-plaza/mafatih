import { readdirSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";

const FORBIDDEN = /recitation|quran|tanzil/i;
const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

function sourcesIn(directory: string): string[] {
  const url = new URL(directory, import.meta.url);
  return readdirSync(url)
    .filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."))
    .map((name) => new URL(name, url).pathname);
}

function importsOf(path: string): string[] {
  return [...readFileSync(path, "utf8").matchAll(IMPORT)].map((match) => match[1] ?? "");
}

test("Practice and the pipeline behind its word list never import Qur'an text or recitation code", () => {
  const files = [
    ...sourcesIn("./"),
    ...sourcesIn("../../scripts/lib/"),
    new URL("../../scripts/extract-words.ts", import.meta.url).pathname,
  ];
  expect(files.length).toBeGreaterThan(5);
  for (const file of files) {
    expect(
      importsOf(file).filter((path) => FORBIDDEN.test(path)),
      file,
    ).toEqual([]);
  }
});

test("the check itself sees the imports of a file", () => {
  const lesson = importsOf(new URL("./lesson.ts", import.meta.url).pathname);
  expect(lesson).toContain("./words.ts");
  expect(lesson).toContain("~/text/prompt.ts");
});
