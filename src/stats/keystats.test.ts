import { expect, test } from "vitest";
import type { Sample } from "~/typing/session.ts";
import { type KeyStats, recordSample, sanitizeStats, statOf } from "./keystats.ts";

const BEH = "ب";

function hit(expected: string, latencyMs: number | null = 400): Sample {
  return { expected, correct: true, latencyMs };
}

function miss(expected: string): Sample {
  return { expected, correct: false, latencyMs: null };
}

function record(samples: readonly Sample[], stats: KeyStats = {}): KeyStats {
  return samples.reduce(recordSample, stats);
}

test("a key that was never typed has an empty record", () => {
  expect(statOf({}, BEH)).toEqual({ attempts: 0, hits: 0, timed: 0, meanMs: 0, recentAccuracy: 0 });
  expect(statOf({}, "constructor")).toEqual({ attempts: 0, hits: 0, timed: 0, meanMs: 0, recentAccuracy: 0 });
});

test("a first-try hit with a latency is an attempt, a hit and a timed sample", () => {
  expect(statOf(record([hit(BEH, 400)]), BEH)).toEqual({
    attempts: 1,
    hits: 1,
    timed: 1,
    meanMs: 400,
    recentAccuracy: 1,
  });
});

test("a hit without a latency, as after a pause, counts for accuracy but not for speed", () => {
  expect(statOf(record([hit(BEH, 400), hit(BEH, null)]), BEH)).toMatchObject({
    attempts: 2,
    hits: 2,
    timed: 1,
    meanMs: 400,
  });
});

test("a miss is an attempt with no hit and no latency", () => {
  expect(statOf(record([miss(BEH)]), BEH)).toEqual({ attempts: 1, hits: 0, timed: 0, meanMs: 0, recentAccuracy: 0 });
});

test("the mean latency starts at the first timed sample and then moves a quarter of the way to each new one", () => {
  expect(statOf(record([hit(BEH, 400), hit(BEH, 800)]), BEH).meanMs).toBe(500);
  expect(statOf(record([miss(BEH), hit(BEH, 800), hit(BEH, 400)]), BEH).meanMs).toBe(700);
});

test("recent accuracy is the exact share of hits over the first twenty attempts", () => {
  expect(statOf(record([hit(BEH), miss(BEH), hit(BEH)]), BEH).recentAccuracy).toBeCloseTo(2 / 3, 10);
  const nineteenHitsOneMiss = [...Array.from({ length: 19 }, () => hit(BEH)), miss(BEH)];
  expect(statOf(record(nineteenHitsOneMiss), BEH).recentAccuracy).toBeCloseTo(0.95, 10);
});

test("after twenty attempts each new one moves recent accuracy by a twentieth", () => {
  const twentyHits = Array.from({ length: 20 }, () => hit(BEH));
  expect(statOf(record([...twentyHits, miss(BEH)]), BEH).recentAccuracy).toBeCloseTo(0.95, 10);
  expect(statOf(record([...twentyHits, miss(BEH), miss(BEH)]), BEH).recentAccuracy).toBeCloseTo(0.9025, 10);
  expect(statOf(record([...twentyHits, miss(BEH), hit(BEH)]), BEH).recentAccuracy).toBeCloseTo(0.9525, 10);
});

test("each key keeps its own record, lam-alef included, and the earlier stats are not changed", () => {
  const before = record([hit(BEH)]);
  const after = record([hit("لا", 600), miss("ت")], before);
  expect(Object.keys(after).sort()).toEqual([BEH, "ت", "لا"].sort());
  expect(statOf(after, "لا").meanMs).toBe(600);
  expect(statOf(after, BEH)).toEqual(statOf(before, BEH));
  expect(Object.keys(before)).toEqual([BEH]);
});

test("saved stats come back as they were", () => {
  const stats = record([hit(BEH, 400), miss(BEH), hit("لا", 650)]);
  expect(sanitizeStats(JSON.parse(JSON.stringify(stats)))).toEqual(stats);
});

test("anything that is not a record of stats becomes empty stats", () => {
  for (const raw of [undefined, null, 3, "x", [1, 2]]) {
    expect(sanitizeStats(raw)).toEqual({});
  }
});

test("hostile or broken entries are dropped and the rest kept", () => {
  const good = { attempts: 4, hits: 3, timed: 2, meanMs: 500, recentAccuracy: 0.75 };
  const raw = JSON.parse(
    JSON.stringify({
      [BEH]: good,
      __proto__x: good,
      toolong: good,
      "": good,
      ت: { ...good, attempts: -1 },
      ن: { ...good, hits: 9 },
      م: { ...good, timed: 9 },
      ك: { ...good, meanMs: "fast" },
      ل: { ...good, recentAccuracy: 7 },
      س: "nope",
      ي: { ...good, attempts: 2.5 },
    }),
  );
  const withProto = JSON.parse(`{"__proto__":${JSON.stringify(good)},"${BEH}":${JSON.stringify(good)}}`);
  expect(sanitizeStats(raw)).toEqual({ [BEH]: good });
  expect(sanitizeStats(withProto)).toEqual({ [BEH]: good });
  expect(Object.hasOwn(sanitizeStats(withProto), "__proto__")).toBe(false);
});

test("only keys the keyboard can type are kept: a letter, a mark, the space or a lam-alef pair", () => {
  const good = { attempts: 1, hits: 1, timed: 1, meanMs: 300, recentAccuracy: 1 };
  const fatha = String.fromCodePoint(0x64e);
  const raw = {
    [BEH]: good,
    [fatha]: good,
    " ": good,
    لا: good,
    ab: good,
    __: good,
    بب: good,
    "\u{1F642}": good,
    ٱ: good,
  };
  expect(Object.keys(sanitizeStats(raw)).sort()).toEqual([BEH, fatha, " ", "لا"].sort());
});

test("figures no session could have produced are dropped", () => {
  const good = { attempts: 4, hits: 3, timed: 2, meanMs: 500, recentAccuracy: 0.75 };
  const raw = {
    [BEH]: { ...good, meanMs: 3000 },
    ت: { ...good, meanMs: 3001 },
    ن: { attempts: 1e300, hits: 1e300, timed: 1e300, meanMs: 500, recentAccuracy: 1 },
    م: { ...good, attempts: 2 ** 53 },
  };
  expect(Object.keys(sanitizeStats(raw))).toEqual([BEH]);
});
