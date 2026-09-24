import assert from "node:assert/strict";
import { test } from "node:test";
import type { LessonSource } from "~/engine/lessons/lesson.ts";
import {
  addRange,
  ayatCount,
  clampPosition,
  completedSurahs,
  coveredAyat,
  emptyRecitation,
  firstGap,
  nextSurah,
  type PassageResult,
  passageAfter,
  passageBefore,
  passageStatus,
  previousSurah,
  progressOf,
  type Recitation,
  type RecitationUpdate,
  recordAyat,
  resumeOf,
  type SurahOrder,
  sanitizeRecitation,
  surahSequence,
} from "~/engine/recitation/recitation.ts";

const CLEAN: PassageResult = { at: 1000, chars: 100, keystrokes: 100, errors: 0, elapsedMs: 30_000 };

function recordPassage(
  recitation: Recitation,
  source: LessonSource,
  result: PassageResult,
  order: SurahOrder,
): RecitationUpdate {
  const { surah, fromAyah, toAyah } = source;
  if (source.kind !== "recite" || surah === undefined || fromAyah === undefined || toAyah === undefined) {
    return { recitation, completion: null };
  }
  return recordAyat(
    recitation,
    { surah, from: fromAyah, to: toAyah, passageFrom: fromAyah, passageTo: toAyah },
    result,
    order,
  );
}

function recite(surah: number, fromAyah: number, toAyah: number): LessonSource {
  return { kind: "recite", surah, fromAyah, toAyah };
}

function typeSurah(recitation: Recitation, surah: number, perLesson: number, result = CLEAN): Recitation {
  let next = recitation;
  for (let from = 1; from <= ayatCount(surah); from += perLesson) {
    const to = Math.min(ayatCount(surah), from + perLesson - 1);
    next = recordPassage(next, recite(surah, from, to), result, "mushaf").recitation;
  }
  return next;
}

test("mushaf order runs 1 to 114 and wraps", () => {
  const order = surahSequence("mushaf");
  assert.equal(order.length, 114);
  assert.equal(order[0], 1);
  assert.equal(nextSurah(2, "mushaf"), 3);
  assert.equal(nextSurah(114, "mushaf"), 1);
  assert.equal(previousSurah(1, "mushaf"), 114);
});

test("Juz 'Amma order starts at An-Nas and walks back to An-Naba, then carries on from Al-Fatiha", () => {
  const order = surahSequence("juz-amma");
  assert.equal(order.length, 114);
  assert.deepEqual(order.slice(0, 3), [114, 113, 112]);
  assert.equal(order[36], 78);
  assert.equal(order[37], 1);
  assert.equal(order[113], 77);
  assert.equal(new Set(order).size, 114);
  assert.equal(nextSurah(78, "juz-amma"), 1);
  assert.equal(nextSurah(114, "juz-amma"), 113);
});

test("ayah ranges merge when they touch or overlap", () => {
  let ranges = addRange([], 5, 8);
  ranges = addRange(ranges, 1, 4);
  assert.deepEqual(ranges, [[1, 8]]);
  ranges = addRange(ranges, 12, 14);
  assert.deepEqual(ranges, [
    [1, 8],
    [12, 14],
  ]);
  assert.equal(coveredAyat(ranges), 11);
  assert.equal(firstGap(ranges, 14), 9);
  assert.equal(firstGap([[1, 14]], 14), undefined);
  assert.equal(firstGap([[3, 14]], 14), 1);
});

test("finishing a passage moves the recitation on to the next ayah", () => {
  const { recitation, completion } = recordPassage(emptyRecitation(), recite(2, 1, 4), CLEAN, "mushaf");
  assert.equal(completion, null);
  assert.deepEqual(recitation.position, { surah: 2, ayah: 5 });
  assert.equal(resumeOf(recitation, 2), 5);
  assert.equal(progressOf(recitation, 2).covered, 4);
  assert.equal(progressOf(recitation, 2).complete, false);
});

test("typing a surah through to its end completes it and moves on to the next", () => {
  const { recitation, completion } = recordPassage(
    typeSurah(emptyRecitation(), 112, 2),
    recite(113, 1, 5),
    CLEAN,
    "mushaf",
  );
  assert.equal(progressOf(recitation, 112).complete, true);
  assert.equal(progressOf(recitation, 112).starred, true);
  assert.equal(completion?.surah, 113);
  assert.equal(completion?.next, 114);
  assert.deepEqual(recitation.position, { surah: 114, ayah: 1 });
  assert.equal(completedSurahs(recitation), 2);
});

test("a completion reports the whole surah, not just its last passage", () => {
  let recitation = recordPassage(emptyRecitation(), recite(112, 1, 2), CLEAN, "mushaf").recitation;
  const update = recordPassage(
    recitation,
    recite(112, 3, 4),
    { at: 2000, chars: 50, keystrokes: 60, errors: 10, elapsedMs: 20_000 },
    "mushaf",
  );
  recitation = update.recitation;
  assert.ok(update.completion);
  assert.equal(update.completion.ayat, 4);
  assert.equal(update.completion.chars, 150);
  assert.equal(update.completion.keystrokes, 160);
  assert.equal(update.completion.errors, 10);
  assert.equal(update.completion.elapsedMs, 50_000);
  assert.equal(update.completion.accuracy, 150 / 160);
  assert.equal(update.completion.cpm, 180);
  assert.equal(update.completion.completions, 1);
  assert.equal(update.completion.starred, false);
  assert.equal(progressOf(recitation, 112).starred, false);
});

test("skipping ahead leaves a gap, and reaching the end sends you back to fill it", () => {
  let recitation = recordPassage(emptyRecitation(), recite(112, 1, 1), CLEAN, "mushaf").recitation;
  const update = recordPassage(recitation, recite(112, 3, 4), CLEAN, "mushaf");
  recitation = update.recitation;
  assert.equal(update.completion, null);
  assert.deepEqual(recitation.position, { surah: 112, ayah: 2 });
  const filled = recordPassage(recitation, recite(112, 2, 2), CLEAN, "mushaf");
  assert.equal(filled.completion?.surah, 112);
});

test("a completed surah can be typed again, and completes a second time only when every ayah is retyped", () => {
  let recitation = typeSurah(emptyRecitation(), 112, 4);
  assert.equal(progressOf(recitation, 112).completions, 1);
  recitation = recordPassage(
    { ...recitation, position: { surah: 112, ayah: 1 } },
    recite(112, 3, 4),
    CLEAN,
    "mushaf",
  ).recitation;
  assert.equal(progressOf(recitation, 112).completions, 1);
  assert.equal(progressOf(recitation, 112).complete, true);
  const again = recordPassage(recitation, recite(112, 1, 2), CLEAN, "mushaf");
  assert.equal(again.completion?.completions, 2);
});

test("the best accuracy is kept across completions", () => {
  const sloppy = { ...CLEAN, keystrokes: 200, errors: 100 };
  let recitation = typeSurah(emptyRecitation(), 112, 4, CLEAN);
  recitation = typeSurah(recitation, 112, 4, sloppy);
  assert.equal(progressOf(recitation, 112).completions, 2);
  assert.equal(progressOf(recitation, 112).starred, true);
});

test("completing a surah continues the next one where it was left", () => {
  let recitation = recordPassage(emptyRecitation(), recite(113, 1, 2), CLEAN, "mushaf").recitation;
  recitation = typeSurah(recitation, 112, 4);
  assert.deepEqual(recitation.position, { surah: 113, ayah: 3 });
});

test("the next and previous passages cross surah boundaries", () => {
  assert.deepEqual(passageAfter(2, 4, "mushaf"), { surah: 2, ayah: 5 });
  assert.deepEqual(passageAfter(112, 4, "mushaf"), { surah: 113, ayah: 1 });
  assert.deepEqual(passageAfter(112, 4, "juz-amma"), { surah: 111, ayah: 1 });
  assert.deepEqual(passageBefore(2, 9, 4, "mushaf"), { surah: 2, ayah: 5 });
  assert.deepEqual(passageBefore(2, 3, 4, "mushaf"), { surah: 2, ayah: 1 });
  assert.deepEqual(passageBefore(2, 1, 4, "mushaf"), { surah: 1, ayah: 4 });
  assert.deepEqual(passageBefore(113, 1, 4, "juz-amma"), { surah: 114, ayah: 3 });
});

test("adaptive and custom lessons leave the recitation alone", () => {
  const recitation = emptyRecitation();
  assert.equal(recordPassage(recitation, { kind: "adaptive" }, CLEAN, "mushaf").recitation, recitation);
  assert.equal(recordPassage(recitation, { kind: "custom" }, CLEAN, "mushaf").recitation, recitation);
});

test("positions are clamped to real surahs and ayat", () => {
  assert.deepEqual(clampPosition({ surah: 0, ayah: 0 }), { surah: 1, ayah: 1 });
  assert.deepEqual(clampPosition({ surah: 999, ayah: 999 }), { surah: 114, ayah: 6 });
  assert.deepEqual(clampPosition({ surah: "x", ayah: 2.7 }), { surah: 1, ayah: 2 });
});

test("a stored recitation survives a round trip and nonsense in it is repaired", () => {
  const recitation = typeSurah(recordPassage(emptyRecitation(), recite(2, 1, 8), CLEAN, "mushaf").recitation, 112, 2);
  assert.deepEqual(sanitizeRecitation(JSON.parse(JSON.stringify(recitation))), recitation);

  const repaired = sanitizeRecitation({
    position: { surah: 112, ayah: 99 },
    surahs: {
      "112": { run: { typed: [[3, 1], [9, 12], "x"], chars: -5 }, resume: 40, completions: 2.7, bestAccuracy: 7 },
      "900": { completions: 1 },
      nonsense: {},
    },
  });
  assert.deepEqual(repaired.position, { surah: 112, ayah: 4 });
  assert.deepEqual(Object.keys(repaired.surahs), ["112"]);
  const record = repaired.surahs[112];
  assert.ok(record);
  assert.deepEqual(record.run.typed, [[1, 4]]);
  assert.equal(record.run.chars, 0);
  assert.equal(record.resume, 4);
  assert.equal(record.completions, 2);
  assert.equal(record.bestAccuracy, 1);
});

function typedAyat(
  recitation: Recitation,
  surah: number,
  from: number,
  to: number,
  passage: [number, number],
): Recitation {
  return recordAyat(recitation, { surah, from, to, passageFrom: passage[0], passageTo: passage[1] }, CLEAN, "mushaf")
    .recitation;
}

test("finishing some ayat of a passage saves them and keeps the passage where it is", () => {
  const recitation = typedAyat(emptyRecitation(), 2, 1, 3, [1, 4]);
  assert.deepEqual(recitation.position, { surah: 2, ayah: 1 });
  assert.equal(resumeOf(recitation, 2), 1);
  assert.equal(progressOf(recitation, 2).covered, 3);
  assert.deepEqual(passageStatus(recitation, 2, 1, 4), { done: false, typedThrough: 3 });
});

test("finishing the last ayah of a passage moves on to the next passage", () => {
  let recitation = typedAyat(emptyRecitation(), 2, 1, 3, [1, 4]);
  recitation = typedAyat(recitation, 2, 4, 4, [1, 4]);
  assert.deepEqual(recitation.position, { surah: 2, ayah: 5 });
  assert.deepEqual(passageStatus(recitation, 2, 1, 4), { done: true, typedThrough: 4 });
  assert.deepEqual(passageStatus(recitation, 2, 5, 8), { done: false, typedThrough: 4 });
});

test("a passage resumes only after the ayat typed from its start, not after a later island", () => {
  const recitation = typedAyat(emptyRecitation(), 2, 2, 3, [2, 5]);
  assert.deepEqual(passageStatus(recitation, 2, 1, 4), { done: false, typedThrough: 0 });
  assert.deepEqual(passageStatus(recitation, 2, 2, 5), { done: false, typedThrough: 3 });
});

test("every passage of a completed surah is done until it is typed again", () => {
  let recitation = typeSurah(emptyRecitation(), 112, 4);
  assert.deepEqual(passageStatus(recitation, 112, 1, 4), { done: true, typedThrough: 4 });
  recitation = typedAyat(recitation, 112, 1, 2, [1, 4]);
  assert.deepEqual(passageStatus(recitation, 112, 1, 4), { done: false, typedThrough: 2 });
});

test("finishing the missing ayah in the middle of a passage completes the surah there and then", () => {
  let recitation = typedAyat(emptyRecitation(), 112, 1, 1, [1, 4]);
  recitation = typedAyat(recitation, 112, 3, 4, [3, 4]);
  const update = recordAyat(recitation, { surah: 112, from: 2, to: 2, passageFrom: 1, passageTo: 4 }, CLEAN, "mushaf");
  assert.equal(update.completion?.surah, 112);
  assert.equal(update.recitation.position.surah, 113);
});
