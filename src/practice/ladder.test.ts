import { expect, test } from "vitest";
import { HOME_ROW_LETTERS } from "~/keyboard/layout101.ts";
import { MARKS, TYPEABLE_LETTERS } from "~/keyboard/typeable.ts";
import { type KeyStats, recordSample } from "~/stats/keystats.ts";
import {
  advance,
  DEFAULT_UNLOCK_CONFIG,
  focusRung,
  initialProgress,
  LADDER,
  type LadderProgress,
  sanitizeProgress,
  unlockedLetters,
  unlockedMarks,
} from "./ladder.ts";

const FATHA = String.fromCodePoint(0x64e);
const KASRA = String.fromCodePoint(0x650);
const DAMMA = String.fromCodePoint(0x64f);
const SUKUN = String.fromCodePoint(0x652);
const SHADDA = String.fromCodePoint(0x651);
const FATHATAN = String.fromCodePoint(0x64b);
const KASRATAN = String.fromCodePoint(0x64d);
const DAMMATAN = String.fromCodePoint(0x64c);

function typed(stats: KeyStats, key: string, hits: number, latencyMs: number, misses = 0): KeyStats {
  let next = stats;
  for (let index = 0; index < misses; index += 1) {
    next = recordSample(next, { expected: key, correct: false, latencyMs: null });
  }
  for (let index = 0; index < hits; index += 1) {
    next = recordSample(next, { expected: key, correct: true, latencyMs });
  }
  return next;
}

function at(unlocked: number): LadderProgress {
  return { unlocked };
}

test("the ladder has every typeable letter once, then the eight marks one by one", () => {
  const letters = LADDER.rungs.filter((rung) => rung.kind === "letter").map((rung) => rung.char);
  const marks = LADDER.rungs.filter((rung) => rung.kind === "mark").map((rung) => rung.char);
  expect(LADDER.rungs).toHaveLength(44);
  expect([...letters].sort()).toEqual([...TYPEABLE_LETTERS].sort());
  expect(LADDER.rungs.slice(0, 36).every((rung) => rung.kind === "letter")).toBe(true);
  expect(marks).toEqual([FATHA, KASRA, DAMMA, SUKUN, SHADDA, FATHATAN, KASRATAN, DAMMATAN]);
  expect([...marks].sort()).toEqual([...MARKS].sort());
});

test("the starter set is the ten letters of the home row, so a new learner never leaves it", () => {
  expect(LADDER.starter).toBe(10);
  const starter = LADDER.rungs.slice(0, 10).map((rung) => rung.char);
  expect([...starter].sort()).toEqual([...HOME_ROW_LETTERS].sort());
  expect(starter).not.toContain("ط");
  expect(starter[0]).toBe("ا");
});

test("the letters unlock in one fixed order, because saved progress is a position on it", () => {
  const letters = LADDER.rungs.slice(0, 36).map((rung) => rung.char);
  expect(letters.join(" ")).toBe("ا ي م ل ب ت ن س ك ش ر ة ع و ق ح ف ص ط خ ه أ ز ج د ض ث غ ء ى ئ ظ ؤ إ ذ آ");
});

test("a new learner has the ten starter letters, no marks, and the last starter letter as the focus", () => {
  const progress = initialProgress();
  expect(progress).toEqual({ unlocked: 10 });
  expect([...unlockedLetters(progress)].sort()).toEqual([...HOME_ROW_LETTERS].sort());
  expect(unlockedMarks(progress).size).toBe(0);
  expect(focusRung(progress)).toEqual({ kind: "letter", char: "ش" });
});

test("letters and marks unlock in ladder order", () => {
  expect(unlockedLetters(at(11)).has("ر")).toBe(true);
  expect(unlockedLetters(at(36)).size).toBe(36);
  expect(unlockedMarks(at(36)).size).toBe(0);
  expect([...unlockedMarks(at(37))]).toEqual([FATHA]);
  expect([...unlockedMarks(at(39))]).toEqual([FATHA, KASRA, DAMMA]);
  expect(unlockedMarks(at(44)).size).toBe(8);
  expect(unlockedLetters(at(44)).size).toBe(36);
  expect(focusRung(at(37))).toEqual({ kind: "mark", char: FATHA });
  expect(focusRung(at(44))).toEqual({ kind: "mark", char: DAMMATAN });
});

test("the mastery bar: eight timed samples, 700 ms for a letter, 1000 ms for a mark, 95% recent accuracy", () => {
  expect(DEFAULT_UNLOCK_CONFIG).toEqual({ minSamples: 8, letterMs: 700, markMs: 1000, minAccuracy: 0.95 });
});

test("mastering the focus letter unlocks exactly the next rung", () => {
  const stats = typed({}, "ش", 8, 500);
  expect(advance(stats, initialProgress())).toEqual({ unlocked: 11 });
});

test("without enough timed samples, speed or accuracy on the focus rung nothing unlocks", () => {
  expect(advance({}, initialProgress())).toEqual({ unlocked: 10 });
  expect(advance(typed({}, "ش", 7, 500), initialProgress())).toEqual({ unlocked: 10 });
  expect(advance(typed({}, "ش", 8, 701), initialProgress())).toEqual({ unlocked: 10 });
  expect(advance(typed({}, "ش", 8, 500, 1), initialProgress())).toEqual({ unlocked: 10 });
  expect(advance(typed({}, "ش", 19, 500, 1), initialProgress())).toEqual({ unlocked: 11 });
});

test("hits without a latency, as after a pause, are no evidence of speed", () => {
  const sevenTimed = typed({}, "ش", 7, 500);
  const withUntimed = Array.from({ length: 5 }).reduce<KeyStats>(
    (stats) => recordSample(stats, { expected: "ش", correct: true, latencyMs: null }),
    sevenTimed,
  );
  expect(advance(withUntimed, initialProgress())).toEqual({ unlocked: 10 });
  expect(advance(typed(withUntimed, "ش", 1, 500), initialProgress())).toEqual({ unlocked: 11 });
});

test("only the focus rung counts: other keys, however well typed, unlock nothing", () => {
  const others = HOME_ROW_LETTERS.filter((letter) => letter !== "ش").reduce(
    (stats, letter) => typed(stats, letter, 30, 300),
    {},
  );
  expect(advance(others, initialProgress())).toEqual({ unlocked: 10 });
});

test("one call never unlocks more than one rung", () => {
  const stats = typed(typed({}, "ش", 8, 500), "ر", 8, 500);
  const once = advance(stats, initialProgress());
  expect(once).toEqual({ unlocked: 11 });
  expect(advance(stats, once)).toEqual({ unlocked: 12 });
});

test("a mark has until 1000 ms, a letter does not", () => {
  expect(advance(typed({}, FATHA, 8, 950), at(37))).toEqual({ unlocked: 38 });
  expect(advance(typed({}, FATHA, 8, 1001), at(37))).toEqual({ unlocked: 37 });
  expect(advance(typed({}, "ر", 8, 950), at(11))).toEqual({ unlocked: 11 });
});

test("the top of the ladder is the end", () => {
  expect(advance(typed({}, DAMMATAN, 20, 300), at(44))).toEqual({ unlocked: 44 });
});

test("a stricter bar can be asked for", () => {
  const stats = typed({}, "ش", 8, 500);
  expect(advance(stats, initialProgress(), { ...DEFAULT_UNLOCK_CONFIG, minSamples: 9 })).toEqual({ unlocked: 10 });
});

test("saved progress is kept when it is a whole number of rungs between the starter set and the top", () => {
  expect(sanitizeProgress({ unlocked: 10 })).toEqual({ unlocked: 10 });
  expect(sanitizeProgress({ unlocked: 23 })).toEqual({ unlocked: 23 });
  expect(sanitizeProgress({ unlocked: 44, extra: 1 })).toEqual({ unlocked: 44 });
});

test("anything else falls back or is brought into range", () => {
  for (const raw of [undefined, null, 7, "x", {}, { unlocked: "12" }, { unlocked: Number.NaN }, { unlocked: 12.5 }]) {
    expect(sanitizeProgress(raw), JSON.stringify(raw)).toEqual({ unlocked: 10 });
  }
  expect(sanitizeProgress({ unlocked: 3 })).toEqual({ unlocked: 10 });
  expect(sanitizeProgress({ unlocked: -1 })).toEqual({ unlocked: 10 });
  expect(sanitizeProgress({ unlocked: 99 })).toEqual({ unlocked: 44 });
});
