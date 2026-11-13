import { expect, test } from "vitest";
import { statOf } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import { applyRecitationAyah, type RecitationState } from "./outcome.ts";
import { completionsOf, initialRecitation, typedAyat } from "./progress.ts";

const FRESH: RecitationState = { stats: {}, recitation: initialRecitation() };
const SAMPLES: Sample[] = [
  { expected: "ب", correct: true, latencyMs: 300 },
  { expected: "س", correct: false, latencyMs: null },
  { expected: "م", correct: true, latencyMs: 280 },
];

test("a typed ayah is recorded with the keys that were typed for it", () => {
  const { stats, recitation } = applyRecitationAyah(FRESH, { surah: 2, ayah: 1 }, SAMPLES, "mushaf");
  expect(typedAyat(recitation, 2)).toBe(1);
  expect(recitation.position).toEqual({ surah: 2, ayah: 2 });
  expect(statOf(stats, "ب")).toMatchObject({ attempts: 1, hits: 1 });
  expect(statOf(stats, "س")).toMatchObject({ attempts: 1, hits: 0 });
  expect(completionsOf(recitation, 2)).toBe(0);
  expect(FRESH).toEqual({ stats: {}, recitation: initialRecitation() });
});

test("the ayah that finishes a surah counts the completion and starts the surah over", () => {
  let state = FRESH;
  for (let ayah = 1; ayah <= 6; ayah += 1) {
    state = applyRecitationAyah(state, { surah: 1, ayah }, SAMPLES, "mushaf");
  }
  const last = applyRecitationAyah(state, { surah: 1, ayah: 7 }, [], "juz-amma");
  expect(completionsOf(last.recitation, 1)).toBe(1);
  expect(typedAyat(last.recitation, 1)).toBe(0);
  expect(last.recitation.position).toEqual({ surah: 2, ayah: 1 });
  expect(statOf(last.stats, "ب").attempts).toBe(6);
});

test("an ayah that does not exist records neither progress nor keys", () => {
  const outcome = applyRecitationAyah(FRESH, { surah: 1, ayah: 8 }, SAMPLES, "mushaf");
  expect(outcome.recitation).toBe(FRESH.recitation);
  expect(outcome.stats).toBe(FRESH.stats);
});

test("the tally of a run is handed back once, on the ayah that finishes the surah", () => {
  let state: RecitationState = FRESH;
  for (let ayah = 1; ayah <= 6; ayah += 1) {
    const outcome = applyRecitationAyah(state, { surah: 1, ayah }, SAMPLES, "mushaf");
    expect(outcome.finished).toBeNull();
    state = outcome;
  }
  const last = applyRecitationAyah(state, { surah: 1, ayah: 7 }, SAMPLES, "mushaf");
  expect(last.finished).toEqual({ correct: 14, total: 21, ms: 4060 });
  expect(last.recitation.surahs[1]?.best).toBeCloseTo(0.6667, 4);
  const retyped = applyRecitationAyah(last, { surah: 1, ayah: 1 }, SAMPLES, "mushaf");
  expect(retyped.finished).toBeNull();
});
