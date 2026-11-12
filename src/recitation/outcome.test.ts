import { expect, test } from "vitest";
import { statOf } from "~/stats/keystats.ts";
import type { Sample } from "~/typing/session.ts";
import { applyRecitationAyah, type RecitationState } from "./outcome.ts";
import { initialRecitation, typedAyat } from "./progress.ts";

const FRESH: RecitationState = { stats: {}, recitation: initialRecitation() };
const SAMPLES: Sample[] = [
  { expected: "ب", correct: true, latencyMs: 300 },
  { expected: "س", correct: false, latencyMs: null },
  { expected: "م", correct: true, latencyMs: 280 },
];

test("a typed ayah is recorded with the keys that were typed for it", () => {
  const { stats, recitation, completion } = applyRecitationAyah(FRESH, { surah: 2, ayah: 1 }, SAMPLES, "mushaf");
  expect(typedAyat(recitation, 2)).toBe(1);
  expect(recitation.position).toEqual({ surah: 2, ayah: 2 });
  expect(statOf(stats, "ب")).toMatchObject({ attempts: 1, hits: 1 });
  expect(statOf(stats, "س")).toMatchObject({ attempts: 1, hits: 0 });
  expect(completion).toBeNull();
  expect(FRESH).toEqual({ stats: {}, recitation: initialRecitation() });
});

test("the ayah that finishes a surah reports the completion", () => {
  let state = FRESH;
  for (let ayah = 1; ayah <= 6; ayah += 1) {
    state = applyRecitationAyah(state, { surah: 1, ayah }, SAMPLES, "mushaf");
  }
  const last = applyRecitationAyah(state, { surah: 1, ayah: 7 }, [], "juz-amma");
  expect(last.completion).toEqual({ surah: 1, completions: 1 });
  expect(last.recitation.position).toEqual({ surah: 2, ayah: 1 });
  expect(statOf(last.stats, "ب").attempts).toBe(6);
});

test("an ayah that does not exist records neither progress nor keys", () => {
  const outcome = applyRecitationAyah(FRESH, { surah: 1, ayah: 8 }, SAMPLES, "mushaf");
  expect(outcome.recitation).toBe(FRESH.recitation);
  expect(outcome.stats).toBe(FRESH.stats);
});
