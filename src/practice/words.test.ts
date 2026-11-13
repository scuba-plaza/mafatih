import { expect, test } from "vitest";
import { loadWords, parseWordList } from "./words.ts";

test("each line of the list is a word and the frequency rank of its spelling", () => {
  expect(parseWordList("مِنْ\t3\nكِتَابٌ\t1440\n")).toEqual([
    { word: "مِنْ", rank: 3 },
    { word: "كِتَابٌ", rank: 1440 },
  ]);
});

test("blank lines hold no word", () => {
  expect(parseWordList("")).toEqual([]);
  expect(parseWordList("\n\nمِنْ\t3\n\n")).toHaveLength(1);
});

test("the committed list loads, most frequent first", async () => {
  const words = await loadWords();
  expect(words.length).toBeGreaterThan(5000);
  expect(words[0]?.rank).toBeLessThan(10);
  expect(words.every((entry, index) => index === 0 || (words[index - 1]?.rank ?? 0) <= entry.rank)).toBe(true);
});
