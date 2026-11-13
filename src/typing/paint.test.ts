import { expect, test } from "vitest";
import { type PaintRun, paintRuns, type TextSpan } from "./paint.ts";

const ONE_BLOCK: readonly TextSpan[] = [{ start: 0, end: 20 }];
const TWO_BLOCKS: readonly TextSpan[] = [
  { start: 0, end: 10 },
  { start: 10, end: 30 },
];

function runs(
  blocks: readonly TextSpan[],
  doneUntil: number,
  apparatus: readonly TextSpan[] = [],
  playing: TextSpan | null = null,
): PaintRun[] {
  return paintRuns({ blocks, doneUntil, apparatus, playing });
}

test("nothing typed and nothing heard paints nothing, so no text can look typed before it is", () => {
  expect(runs(ONE_BLOCK, 0)).toEqual([]);
  expect(runs(TWO_BLOCKS, 0)).toEqual([]);
});

test("typed text is painted as done up to the cursor and not a letter further", () => {
  expect(runs(ONE_BLOCK, 7)).toEqual([{ name: "mafatih-done", start: 0, end: 7 }]);
  expect(runs(ONE_BLOCK, 20)).toEqual([{ name: "mafatih-done", start: 0, end: 20 }]);
});

test("a cursor at the very start of a later block paints the blocks before it and nothing of its own", () => {
  expect(runs(TWO_BLOCKS, 10)).toEqual([{ name: "mafatih-done", start: 0, end: 10 }]);
});

test("typed text that crosses a block is painted one run per block, never across the break", () => {
  expect(runs(TWO_BLOCKS, 14)).toEqual([
    { name: "mafatih-done", start: 0, end: 10 },
    { name: "mafatih-done", start: 10, end: 14 },
  ]);
});

test("a sign keeps its own colour wherever the cursor is, and the typed text around it stays done", () => {
  const sign = { start: 5, end: 8 };
  expect(runs(ONE_BLOCK, 12, [sign])).toEqual([
    { name: "mafatih-done", start: 0, end: 5 },
    { name: "mafatih-apparatus", start: 5, end: 8 },
    { name: "mafatih-done", start: 8, end: 12 },
  ]);
  expect(runs(ONE_BLOCK, 0, [sign])).toEqual([{ name: "mafatih-apparatus", start: 5, end: 8 }]);
});

test("a sign the cursor stands inside is cut at the cursor and is a sign on both sides", () => {
  expect(runs(ONE_BLOCK, 6, [{ start: 5, end: 8 }])).toEqual([
    { name: "mafatih-done", start: 0, end: 5 },
    { name: "mafatih-apparatus", start: 5, end: 6 },
    { name: "mafatih-apparatus", start: 6, end: 8 },
  ]);
});

test("the ayah being heard is washed, and each part of it keeps the colour the cursor gives it", () => {
  expect(runs(ONE_BLOCK, 8, [], { start: 4, end: 16 })).toEqual([
    { name: "mafatih-done", start: 0, end: 4 },
    { name: "mafatih-done-playing", start: 4, end: 8 },
    { name: "mafatih-upcoming-playing", start: 8, end: 16 },
  ]);
});

test("an ayah heard before any of it is typed is washed in the colour of untyped text", () => {
  expect(runs(ONE_BLOCK, 0, [], { start: 4, end: 16 })).toEqual([
    { name: "mafatih-upcoming-playing", start: 4, end: 16 },
  ]);
});

test("an ayah heard after all of it is typed is washed in the colour of typed text", () => {
  expect(runs(ONE_BLOCK, 20, [], { start: 4, end: 16 })).toEqual([
    { name: "mafatih-done", start: 0, end: 4 },
    { name: "mafatih-done-playing", start: 4, end: 16 },
    { name: "mafatih-done", start: 16, end: 20 },
  ]);
});

test("a sign inside the ayah being heard is washed and keeps the sign colour", () => {
  expect(runs(ONE_BLOCK, 0, [{ start: 6, end: 8 }], { start: 4, end: 16 })).toEqual([
    { name: "mafatih-upcoming-playing", start: 4, end: 6 },
    { name: "mafatih-apparatus-playing", start: 6, end: 8 },
    { name: "mafatih-upcoming-playing", start: 8, end: 16 },
  ]);
});

test("an ayah heard across a block break is washed one run per block", () => {
  expect(runs(TWO_BLOCKS, 12, [], { start: 6, end: 18 })).toEqual([
    { name: "mafatih-done", start: 0, end: 6 },
    { name: "mafatih-done-playing", start: 6, end: 10 },
    { name: "mafatih-done-playing", start: 10, end: 12 },
    { name: "mafatih-upcoming-playing", start: 12, end: 18 },
  ]);
});

test("no letter is ever painted twice and no run leaves its block, whatever the cursor, signs and ayah", () => {
  const signs: readonly TextSpan[] = [
    { start: 8, end: 10 },
    { start: 24, end: 27 },
  ];
  const heard: readonly (TextSpan | null)[] = [
    null,
    { start: 2, end: 9 },
    { start: 8, end: 25 },
    { start: 12, end: 30 },
  ];
  for (let cursor = 0; cursor <= 30; cursor += 1) {
    for (const playing of heard) {
      const painted = runs(TWO_BLOCKS, cursor, signs, playing);
      const owners = new Map<number, number>();
      for (const run of painted) {
        expect(run.start, `${cursor} ${JSON.stringify(playing)}`).toBeLessThan(run.end);
        const block = TWO_BLOCKS.find((candidate) => run.start >= candidate.start && run.end <= candidate.end);
        expect(block, `a run inside one block at ${cursor}`).toBeDefined();
        for (let letter = run.start; letter < run.end; letter += 1) {
          owners.set(letter, (owners.get(letter) ?? 0) + 1);
        }
      }
      expect(
        [...owners.values()].every((count) => count === 1),
        `${cursor} ${JSON.stringify(playing)}`,
      ).toBe(true);
    }
  }
});

test("every letter the cursor has passed is painted, and none beyond it unless it is a sign or being heard", () => {
  const signs: readonly TextSpan[] = [{ start: 8, end: 10 }];
  for (let cursor = 0; cursor <= 30; cursor += 1) {
    const painted = runs(TWO_BLOCKS, cursor, signs, null);
    const covered = (letter: number) => painted.some((run) => letter >= run.start && letter < run.end);
    for (let letter = 0; letter < 30; letter += 1) {
      const isSign = letter >= 8 && letter < 10;
      expect(covered(letter), `letter ${letter} with the cursor at ${cursor}`).toBe(letter < cursor || isSign);
    }
  }
});
