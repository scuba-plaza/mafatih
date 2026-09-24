import assert from "node:assert/strict";
import { test } from "node:test";
import { generateRecitePassage } from "~/engine/lessons/recite.ts";
import { buildLesson, finishedAyat, seedFromQuery, startSession } from "~/engine/plan.ts";
import { emptyRecitation, type Recitation, recordAyat } from "~/engine/recitation/recitation.ts";
import { defaultProfile, type Profile } from "~/storage/profile.ts";

const TALLY = { at: 1, chars: 10, keystrokes: 10, errors: 0, elapsedMs: 1000 };

function reciting(surah: number, ayah: number, recitation: Recitation = emptyRecitation()): Profile {
  const base = defaultProfile();
  return {
    ...base,
    settings: { ...base.settings, mode: "recite", tierOverride: "none", ayatPerLesson: 4 },
    recitation: { ...recitation, position: { surah, ayah } },
  };
}

function typed(surah: number, from: number, to: number, passage: [number, number]): Recitation {
  return recordAyat(
    emptyRecitation(),
    { surah, from, to, passageFrom: passage[0], passageTo: passage[1] },
    TALLY,
    "mushaf",
  ).recitation;
}

test("the seed comes from the query string when it is a number", () => {
  assert.equal(seedFromQuery("?seed=42"), 42);
  assert.equal(seedFromQuery("?seed=abc"), null);
  assert.equal(seedFromQuery(""), null);
});

test("a fresh passage starts at its first character, basmala included", () => {
  const profile = reciting(2, 1);
  const lesson = buildLesson(profile, 1);
  const start = startSession(profile, lesson, false);
  assert.equal(start.reviewing, false);
  assert.equal(start.session.cursor, 0);
  assert.ok(lesson.basmala !== null);
});

test("a part-typed passage resumes after its last finished ayah", () => {
  const profile = reciting(2, 1, typed(2, 1, 3, [1, 4]));
  const lesson = buildLesson(profile, 1);
  const fourth = lesson.ayat.find((span) => span.ayah === 4);
  const start = startSession(profile, lesson, false);
  assert.equal(start.reviewing, false);
  assert.equal(start.session.cursor, fourth?.start);
  assert.equal(start.session.origin, fourth?.start);
});

test("a finished passage opens for review, and types from the start when redone", () => {
  const profile = reciting(2, 1, typed(2, 1, 4, [1, 4]));
  const lesson = buildLesson(profile, 1);
  const review = startSession(profile, lesson, false);
  assert.equal(review.reviewing, true);
  assert.equal(review.session.cursor, [...lesson.text].length);
  const redo = startSession(profile, lesson, true);
  assert.equal(redo.reviewing, false);
  assert.equal(redo.session.cursor, 0);
});

test("adaptive and custom lessons always start fresh", () => {
  const profile = defaultProfile();
  const start = startSession(profile, buildLesson(profile, 7), false);
  assert.equal(start.reviewing, false);
  assert.equal(start.session.cursor, 0);
});

test("finished ayat are those whose last character the cursor has passed since the checkpoint", () => {
  const lesson = generateRecitePassage({ surah: 2, fromAyah: 1, tier: "none", maxAyat: 4 });
  const [first, second, third] = lesson.ayat;
  assert.ok(first && second && third);
  assert.deepEqual(
    finishedAyat(lesson, 0, second.end).map((span) => span.ayah),
    [1, 2],
  );
  assert.deepEqual(
    finishedAyat(lesson, second.end, third.end - 1).map((span) => span.ayah),
    [],
  );
  assert.deepEqual(
    finishedAyat(lesson, second.end, third.end).map((span) => span.ayah),
    [3],
  );
});
