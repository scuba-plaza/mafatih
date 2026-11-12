import { expect, test } from "vitest";
import {
  completionsOf,
  endsOrder,
  initialRecitation,
  passageBefore,
  positionAfter,
  type RecitationProgress,
  recordAyah,
  resumeOf,
  sanitizeRecitation,
  startOf,
  typedAyat,
} from "./progress.ts";

function type(progress: RecitationProgress, surah: number, from: number, to: number): RecitationProgress {
  let next = progress;
  for (let ayah = from; ayah <= to; ayah += 1) {
    next = recordAyah(next, { surah, ayah }, "mushaf");
  }
  return next;
}

test("nothing is typed at first, and a learner starts with the first surah of the chosen order", () => {
  const fresh = initialRecitation();
  expect(fresh).toEqual({ position: null, surahs: {} });
  expect(startOf(fresh, "mushaf")).toEqual({ surah: 1, ayah: 1 });
  expect(startOf(fresh, "juz-amma")).toEqual({ surah: 114, ayah: 1 });
  expect(typedAyat(fresh, 2)).toBe(0);
  expect(completionsOf(fresh, 2)).toBe(0);
  expect(resumeOf(fresh, 2)).toBe(1);
});

test("a typed ayah is remembered and the position moves to the ayah after it", () => {
  const progress = recordAyah(initialRecitation(), { surah: 2, ayah: 1 }, "mushaf");
  expect(completionsOf(progress, 2)).toBe(0);
  expect(progress.position).toEqual({ surah: 2, ayah: 2 });
  expect(startOf(progress, "juz-amma")).toEqual({ surah: 2, ayah: 2 });
  expect(typedAyat(progress, 2)).toBe(1);
  expect(resumeOf(progress, 2)).toBe(2);
  expect(initialRecitation()).toEqual({ position: null, surahs: {} });
});

test("typing the same ayah again changes nothing", () => {
  const once = type(initialRecitation(), 2, 1, 3);
  expect(type(once, 2, 2, 3)).toEqual(once);
  expect(typedAyat(once, 2)).toBe(3);
});

test("ayat typed out of order are all counted, and the surah resumes at the first one still missing", () => {
  const progress = type(type(initialRecitation(), 2, 5, 9), 2, 1, 2);
  expect(typedAyat(progress, 2)).toBe(7);
  expect(resumeOf(progress, 2)).toBe(3);
  expect(progress.position).toEqual({ surah: 2, ayah: 3 });
  expect(progress.surahs[2]?.typed).toEqual([
    [1, 2],
    [5, 9],
  ]);
});

test("the surah is complete exactly when its last missing ayah is typed, and then starts over", () => {
  const almost = type(initialRecitation(), 1, 2, 7);
  expect(completionsOf(almost, 1)).toBe(0);
  const progress = recordAyah(almost, { surah: 1, ayah: 1 }, "mushaf");
  expect(completionsOf(progress, 1)).toBe(1);
  expect(typedAyat(progress, 1)).toBe(0);
  expect(resumeOf(progress, 1)).toBe(1);
  const again = type(progress, 1, 1, 6);
  expect(completionsOf(again, 1)).toBe(1);
  expect(completionsOf(recordAyah(again, { surah: 1, ayah: 7 }, "mushaf"), 1)).toBe(2);
});

test("after the last ayah of a surah the position is the next surah of the order", () => {
  expect(type(initialRecitation(), 1, 1, 7).position).toEqual({ surah: 2, ayah: 1 });
  expect(recordAyah(initialRecitation(), { surah: 114, ayah: 6 }, "juz-amma").position).toEqual({
    surah: 113,
    ayah: 1,
  });
});

test("the position after an ayah is the next ayah, the next surah of the order, or the start again", () => {
  expect(positionAfter({ surah: 2, ayah: 4 }, "mushaf")).toEqual({ surah: 2, ayah: 5 });
  expect(positionAfter({ surah: 2, ayah: 286 }, "mushaf")).toEqual({ surah: 3, ayah: 1 });
  expect(positionAfter({ surah: 114, ayah: 6 }, "mushaf")).toEqual({ surah: 1, ayah: 1 });
  expect(positionAfter({ surah: 78, ayah: 40 }, "juz-amma")).toEqual({ surah: 1, ayah: 1 });
  expect(positionAfter({ surah: 77, ayah: 50 }, "juz-amma")).toEqual({ surah: 114, ayah: 1 });
});

test("only the last ayah of the last surah of an order ends the order", () => {
  expect(endsOrder({ surah: 114, ayah: 6 }, "mushaf")).toBe(true);
  expect(endsOrder({ surah: 114, ayah: 5 }, "mushaf")).toBe(false);
  expect(endsOrder({ surah: 113, ayah: 6 }, "mushaf")).toBe(false);
  expect(endsOrder({ surah: 114, ayah: 6 }, "juz-amma")).toBe(false);
  expect(endsOrder({ surah: 77, ayah: 50 }, "juz-amma")).toBe(true);
  expect(endsOrder({ surah: 77, ayah: 49 }, "juz-amma")).toBe(false);
});

test("the passage before starts a passage length earlier, or is the last passage of the surah before", () => {
  expect(passageBefore({ surah: 2, ayah: 9 }, 4, "mushaf")).toEqual({ surah: 2, ayah: 5 });
  expect(passageBefore({ surah: 2, ayah: 3 }, 4, "mushaf")).toEqual({ surah: 2, ayah: 1 });
  expect(passageBefore({ surah: 2, ayah: 1 }, 4, "mushaf")).toEqual({ surah: 1, ayah: 5 });
  expect(passageBefore({ surah: 2, ayah: 1 }, 7, "mushaf")).toEqual({ surah: 1, ayah: 1 });
  expect(passageBefore({ surah: 1, ayah: 1 }, 4, "mushaf")).toEqual({ surah: 114, ayah: 5 });
  expect(passageBefore({ surah: 1, ayah: 1 }, 4, "juz-amma")).toEqual({ surah: 78, ayah: 37 });
  expect(passageBefore({ surah: 113, ayah: 1 }, 1, "juz-amma")).toEqual({ surah: 114, ayah: 6 });
});

test("a passage length that makes no sense still gives a real ayah", () => {
  const start = { surah: 2, ayah: 1 };
  expect(passageBefore(start, Number.POSITIVE_INFINITY, "mushaf")).toEqual({ surah: 1, ayah: 1 });
  expect(passageBefore(start, 1000, "mushaf")).toEqual({ surah: 1, ayah: 1 });
  expect(passageBefore(start, 2.9, "mushaf")).toEqual({ surah: 1, ayah: 7 });
  expect(passageBefore(start, 0, "mushaf")).toEqual({ surah: 1, ayah: 7 });
  expect(passageBefore(start, Number.NaN, "mushaf")).toEqual({ surah: 1, ayah: 7 });
  expect(passageBefore({ surah: 2, ayah: 9 }, Number.POSITIVE_INFINITY, "mushaf")).toEqual({ surah: 2, ayah: 1 });
  expect(passageBefore({ surah: 2, ayah: 9 }, 2.9, "mushaf")).toEqual({ surah: 2, ayah: 7 });
});

test("an ayah or surah that does not exist is not recorded", () => {
  const fresh = initialRecitation();
  for (const position of [
    { surah: 0, ayah: 1 },
    { surah: 115, ayah: 1 },
    { surah: 1, ayah: 8 },
    { surah: 1, ayah: 0 },
    { surah: 1, ayah: 1.5 },
  ]) {
    expect(recordAyah(fresh, position, "mushaf")).toBe(fresh);
  }
});

test("saved progress comes back as it was", () => {
  const progress = type(type(type(initialRecitation(), 1, 1, 7), 2, 1, 5), 36, 10, 12);
  expect(sanitizeRecitation(JSON.parse(JSON.stringify(progress)))).toEqual(progress);
  expect(sanitizeRecitation(JSON.parse(JSON.stringify(initialRecitation())))).toEqual(initialRecitation());
});

test("anything that is not progress becomes fresh progress", () => {
  for (const raw of [undefined, null, 3, "x", [], { position: 5, surahs: 7 }]) {
    expect(sanitizeRecitation(raw)).toEqual(initialRecitation());
  }
});

test("broken parts of saved progress are dropped and the rest kept", () => {
  const raw = {
    position: { surah: 2, ayah: 999 },
    surahs: {
      1: { typed: [[1, 3]], completions: 2 },
      2: { typed: [[5, 2], [0, 1], [280, 400], [3, 4], [4, 6], "x", [7]], completions: -1 },
      3: "nope",
      115: { typed: [[1, 1]], completions: 1 },
      abc: { typed: [[1, 1]], completions: 1 },
      36: { typed: "all", completions: 1.5 },
    },
  };
  expect(sanitizeRecitation(raw)).toEqual({
    position: null,
    surahs: {
      1: { typed: [[1, 3]], completions: 2 },
      2: { typed: [[3, 6]], completions: 0 },
    },
  });
  expect(sanitizeRecitation({ position: { surah: 2, ayah: 286 }, surahs: {} }).position).toEqual({
    surah: 2,
    ayah: 286,
  });
  expect(sanitizeRecitation({ position: { surah: 2.5, ayah: 1 }, surahs: {} }).position).toBeNull();
});

test("a saved surah that would already be complete is not kept as half typed", () => {
  const raw = { position: null, surahs: { 1: { typed: [[1, 7]], completions: 0 } } };
  expect(typedAyat(sanitizeRecitation(raw), 1)).toBe(0);
});
