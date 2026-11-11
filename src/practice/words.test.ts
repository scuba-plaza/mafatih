import { expect, test } from "vitest";
import { loadWords, parseWordList } from "./words.ts";

test("each line of the list is a word, its frequency rank and its part of speech", () => {
  expect(parseWordList("مِنْ\t3\tprep\nكِتَابٌ\t1440\tnoun\n")).toEqual([
    { word: "مِنْ", rank: 3, pos: "prep" },
    { word: "كِتَابٌ", rank: 1440, pos: "noun" },
  ]);
});

test("blank lines hold no word", () => {
  expect(parseWordList("")).toEqual([]);
  expect(parseWordList("\n\nمِنْ\t3\tprep\n\n")).toHaveLength(1);
});

test("the committed list loads, most frequent first, starting with everyday function words", async () => {
  const words = await loadWords();
  expect(words.length).toBeGreaterThan(5000);
  expect(words.slice(0, 3).map((entry) => entry.word)).toEqual(["لَا", "مَنْ", "مِنْ"]);
  expect(words.every((entry, index) => index === 0 || (words[index - 1]?.rank ?? 0) <= entry.rank)).toBe(true);
});
