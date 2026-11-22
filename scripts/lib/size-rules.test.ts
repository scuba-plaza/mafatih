import { expect, test } from "vitest";
import { type Chunk, entryNameOf, KILOBYTE, sampleWords, sizeProblems } from "./size-rules.ts";

function chunk(name: string, kilobytes: number, text = ""): Chunk {
  return { name, gzipBytes: Math.round(kilobytes * KILOBYTE), text };
}

const WORDS = Array.from({ length: 5000 }, (_, index) => `كلمة${index}`);

function healthy(): Chunk[] {
  return [
    chunk("index-AAA.js", 105),
    chunk("words-BBB.js", 48),
    ...Array.from({ length: 114 }, (_, index) => chunk(`${String(index + 1).padStart(3, "0")}-CCC.js`, 21)),
    chunk("other-DDD.js", 400),
  ];
}

test("a build inside every limit has no problems", () => {
  expect(sizeProblems(healthy(), "index-AAA.js", WORDS)).toEqual([]);
});

test.each([
  ["index-AAA.js", 130],
  ["007-CCC.js", 80],
  ["words-BBB.js", 100],
])("%s may reach %i kilobytes gzipped but not pass it, and only it is named", (name, limit) => {
  const sized = (kilobytes: number) => healthy().map((each) => (each.name === name ? chunk(name, kilobytes) : each));
  expect(sizeProblems(sized(limit), "index-AAA.js", WORDS)).toEqual([]);
  const problems = sizeProblems(sized(limit + 1), "index-AAA.js", WORDS);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain(name);
  expect(problems[0]).toContain(`the limit is ${limit} KB`);
});

test("every surah is a chunk of its own: a missing one is a problem", () => {
  const chunks = healthy().filter((each) => each.name !== "050-CCC.js");
  const problems = sizeProblems(chunks, "index-AAA.js", WORDS);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("114");
});

test("the practice words must not be in the entry chunk, and must have a chunk", () => {
  const inEntry = [chunk("index-AAA.js", 105, sampleWords(WORDS).join(" ")), ...healthy().slice(1)];
  const found = sizeProblems(inEntry, "index-AAA.js", WORDS);
  expect(found).toHaveLength(1);
  expect(found[0]).toContain("Practice words");
  const noChunk = healthy().filter((each) => !each.name.startsWith("words-"));
  const missing = sizeProblems(noChunk, "index-AAA.js", WORDS);
  expect(missing).toHaveLength(1);
  expect(missing[0]).toContain("words");
});

test("a few practice words by coincidence in the entry chunk are not a leak", () => {
  const some = sampleWords(WORDS).slice(0, 3).join(" ");
  expect(sizeProblems([chunk("index-AAA.js", 105, some), ...healthy().slice(1)], "index-AAA.js", WORDS)).toEqual([]);
});

test("an entry that is not among the chunks is a problem, not a crash", () => {
  expect(sizeProblems(healthy(), "gone.js", WORDS)[0]).toContain("gone.js");
});

test("the entry chunk is the module script of the page", () => {
  expect(entryNameOf('<script type="module" crossorigin src="/assets/index-D5KiU5FR.js"></script>')).toBe(
    "index-D5KiU5FR.js",
  );
  expect(entryNameOf('<script type="module" src="/mafatih/assets/index-X.js"></script>')).toBe("index-X.js");
  expect(entryNameOf("<html></html>")).toBeNull();
});

test("the sample takes every 125th word and is never empty", () => {
  expect(sampleWords(WORDS)).toHaveLength(40);
  expect(sampleWords(WORDS)[1]).toBe(WORDS[125]);
  expect(sampleWords(["a"])).toEqual(["a"]);
  expect(sampleWords([])).toEqual([]);
});
