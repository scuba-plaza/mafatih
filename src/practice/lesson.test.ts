import { expect, test } from "vitest";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import { isFullyVocalized, isMark, skeleton } from "~/text/arabic.ts";
import type { Prompt } from "~/text/prompt.ts";
import { initialProgress, type LadderProgress, unlockedLetters } from "./ladder.ts";
import { buildPracticeLesson, LESSON_CHARS } from "./lesson.ts";
import { loadWords, type PracticeWord } from "./words.ts";

const FATHA = String.fromCodePoint(0x64e);
const FIRST_MARK_RUNG = 37;
const WORDS = await loadWords();

function lesson(seed: number, progress: LadderProgress = initialProgress(), words: readonly PracticeWord[] = WORDS) {
  return buildPracticeLesson({ words, progress, vocalization: "auto", seed });
}

function typedText(prompt: Prompt): string {
  return prompt.units.map((unit) => unit.text).join("");
}

function wordsOf(prompt: Prompt): string[] {
  return prompt.shown.split(" ");
}

test("a new learner gets a lesson at once, and it needs nothing but the ten home-row letters", () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const prompt = lesson(seed);
    expect(prompt.units.length).toBeGreaterThanOrEqual(LESSON_CHARS);
    expect([...typedText(prompt)].every((char) => char === " " || HOME_ROW_LETTERS.includes(char))).toBe(true);
  }
});

test("at every point of the ladder a lesson uses only the letters unlocked so far", () => {
  for (const unlocked of [10, 11, 15, 22, 30, 36, 37, 40, 44]) {
    const allowed = unlockedLetters({ unlocked });
    for (let seed = 0; seed < 25; seed += 1) {
      const letters = [...skeleton(lesson(seed, { unlocked }).shown)].filter((char) => char !== " ");
      expect(letters.every((letter) => allowed.has(letter))).toBe(true);
    }
  }
});

test("the same seed gives the same lesson, another seed another one", () => {
  expect(lesson(7)).toEqual(lesson(7));
  expect(new Set(Array.from({ length: 20 }, (_, seed) => lesson(seed).shown)).size).toBeGreaterThan(15);
});

test("a lesson is about thirty-eight typed characters of whole words, single spaces between them", () => {
  for (let seed = 0; seed < 50; seed += 1) {
    const prompt = lesson(seed);
    const longest = Math.max(...wordsOf(prompt).map((word) => [...skeleton(word)].length));
    expect(LESSON_CHARS).toBe(38);
    expect(prompt.units.length).toBeLessThanOrEqual(LESSON_CHARS + longest);
    expect(prompt.shown).not.toMatch(/^ | {2}| $/);
    expect(prompt.breaks).toEqual([]);
  }
});

test("no word comes twice in a row or more than twice in a lesson", () => {
  for (const unlocked of [10, 20, 44]) {
    for (let seed = 0; seed < 40; seed += 1) {
      const shown = wordsOf(lesson(seed, { unlocked }));
      shown.forEach((word, index) => {
        expect(shown[index + 1]).not.toBe(word);
        expect(shown.filter((other) => other === word).length).toBeLessThanOrEqual(2);
      });
    }
  }
});

test("about half the words of a lesson carry the newest letter, however rare the letter is", () => {
  for (const [unlocked, focus] of [
    [10, "ش"],
    [11, "ر"],
    [23, "ز"],
    [32, "ظ"],
    [36, "آ"],
  ] as const) {
    const lessons = Array.from({ length: 60 }, (_, seed) => lesson(seed, { unlocked }));
    const shown = lessons.flatMap(wordsOf);
    const share = shown.filter((word) => word.includes(focus)).length / shown.length;
    expect(lessons.filter((prompt) => prompt.shown.includes(focus)).length, focus).toBeGreaterThanOrEqual(57);
    expect(share, focus).toBeGreaterThan(0.4);
    expect(share, focus).toBeLessThan(0.75);
  }
});

test("every shown word is fully vocalized, whatever is typed", () => {
  for (const vocalization of ["auto", "letters", "harakat", "full"] as const) {
    const prompt = buildPracticeLesson({ words: WORDS, progress: { unlocked: 30 }, vocalization, seed: 3 });
    expect(wordsOf(prompt).every(isFullyVocalized)).toBe(true);
  }
});

test("letters only types no mark, full vocalization types every mark that is shown", () => {
  const options = { words: WORDS, progress: { unlocked: 30 }, seed: 5 };
  const letters = buildPracticeLesson({ ...options, vocalization: "letters" });
  const full = buildPracticeLesson({ ...options, vocalization: "full" });
  expect([...typedText(letters)].some(isMark)).toBe(false);
  expect(typedText(full)).toBe(full.shown);
  expect(typedText(full)).not.toBe(skeleton(full.shown));
});

test("on auto a learner types exactly the marks unlocked so far", () => {
  const beforeMarks = lesson(1, { unlocked: 36 });
  const firstMark = lesson(1, { unlocked: FIRST_MARK_RUNG });
  expect([...typedText(beforeMarks)].some(isMark)).toBe(false);
  expect(new Set([...typedText(firstMark)].filter(isMark))).toEqual(new Set([FATHA]));
});

test("when the newest rung is a mark, most words carry it", () => {
  const kasratan = String.fromCodePoint(0x64d);
  const drilled = Array.from({ length: 60 }, (_, seed) => lesson(seed, { unlocked: 43 })).flatMap(wordsOf);
  const plain = Array.from({ length: 60 }, (_, seed) => lesson(seed, { unlocked: 42 })).flatMap(wordsOf);
  const share = (shown: readonly string[]) => shown.filter((word) => word.includes(kasratan)).length / shown.length;
  expect(share(drilled)).toBeGreaterThan(0.4);
  expect(share(drilled)).toBeGreaterThan(2 * share(plain));
});

test("frequent words come more often than rare ones", () => {
  const starter = WORDS.filter((entry) =>
    [...skeleton(entry.word)].every((letter) => HOME_ROW_LETTERS.includes(letter)),
  );
  const list = starter.map((entry, index) => ({ word: entry.word, rank: index % 2 === 0 ? 10 : 9000 }));
  const shown = Array.from({ length: 300 }, (_, seed) => lesson(seed, initialProgress(), list)).flatMap(wordsOf);
  const frequent = new Set(list.filter((entry) => entry.rank === 10).map((entry) => entry.word));
  const often = shown.filter((word) => frequent.has(word)).length;
  expect(often).toBeGreaterThan(3 * (shown.length - often));
});

test("a spelling with several readings comes no more often than a spelling with one", () => {
  const starter = WORDS.filter((entry) =>
    [...skeleton(entry.word)].every((letter) => HOME_ROW_LETTERS.includes(letter)),
  );
  const list = starter.filter((entry) => !entry.word.includes("ش")).map((entry) => ({ word: entry.word, rank: 1 }));
  const readings = new Map<string, number>();
  for (const entry of list) {
    readings.set(skeleton(entry.word), (readings.get(skeleton(entry.word)) ?? 0) + 1);
  }
  const shown = Array.from({ length: 600 }, (_, seed) => lesson(seed, initialProgress(), list)).flatMap(wordsOf);
  const perSpelling = (wanted: (count: number) => boolean) => {
    const spellings = [...readings].filter(([, count]) => wanted(count)).map(([spelling]) => spelling);
    return shown.filter((word) => spellings.includes(skeleton(word))).length / spellings.length;
  };
  const single = perSpelling((count) => count === 1);
  const several = perSpelling((count) => count >= 3);
  expect(several).toBeGreaterThan(0.8 * single);
  expect(several).toBeLessThan(1.2 * single);
});

test("with no word to give, the lesson is empty instead of failing", () => {
  expect(lesson(1, initialProgress(), []).shown).toBe("");
  expect(lesson(1, initialProgress(), [{ word: "ظَرْفٌ", rank: 1 }]).units).toEqual([]);
});

test("a list of one or two words still ends", () => {
  const one = lesson(1, initialProgress(), [{ word: "بَابٌ", rank: 1 }]);
  const two = lesson(1, initialProgress(), [
    { word: "بَابٌ", rank: 1 },
    { word: "مَالٌ", rank: 2 },
  ]);
  expect(wordsOf(one)).toEqual(["بَابٌ"]);
  expect(wordsOf(two)).toHaveLength(4);
});
