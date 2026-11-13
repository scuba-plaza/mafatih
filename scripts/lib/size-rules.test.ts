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

test("the entry chunk may not pass 130 kilobytes gzipped, and the message names it", () => {
  const chunks = [chunk("index-AAA.js", 131), ...healthy().slice(1)];
  const problems = sizeProblems(chunks, "index-AAA.js", WORDS);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("index-AAA.js");
  expect(problems[0]).toContain("130");
  expect(sizeProblems([chunk("index-AAA.js", 130), ...healthy().slice(1)], "index-AAA.js", WORDS)).toEqual([]);
});

test("a surah chunk may not pass 80 kilobytes, and only the one that does is named", () => {
  const chunks = healthy().map((each) => (each.name === "007-CCC.js" ? chunk(each.name, 81) : each));
  const problems = sizeProblems(chunks, "index-AAA.js", WORDS);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("007-CCC.js");
});

test("the practice list may not pass 100 kilobytes", () => {
  const chunks = healthy().map((each) => (each.name === "words-BBB.js" ? chunk(each.name, 101) : each));
  const problems = sizeProblems(chunks, "index-AAA.js", WORDS);
  expect(problems).toHaveLength(1);
  expect(problems[0]).toContain("words-BBB.js");
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
