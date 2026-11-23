import { expect, test } from "vitest";
import { unlockedMarks } from "~/practice/ladder.ts";
import { expectedText, view } from "~/typing/session.ts";
import { PREVIEW_TEXT, previewSession } from "./previewSession.ts";

const NO_MARKS = new Set<string>();
const ALL_MARKS = unlockedMarks({ unlocked: 44 });

function keysTyped(vocalization: "auto" | "letters" | "harakat" | "full", marks: ReadonlySet<string>): number {
  return previewSession({ vocalization, unlockedMarks: marks, requireBackspace: true }).samples.filter(
    (sample) => sample.correct,
  ).length;
}

test("the sample sentence is the one the owner approved", () => {
  expect(PREVIEW_TEXT).toBe("كِتَابٌ جَدِيدٌ عَلَى الطَّاوِلَةِ وَالقَلَمُ بِجَانِبِهِ");
});

test("whatever the vocalization, the next key to type is jeem, after the first word and its space", () => {
  for (const vocalization of ["auto", "letters", "harakat", "full"] as const) {
    const session = previewSession({ vocalization, unlockedMarks: NO_MARKS, requireBackspace: true });
    expect(expectedText(session)).toBe("ج");
  }
});

test("the first word needs 5 keys for letters only, 7 for harakat, 8 for full", () => {
  expect(keysTyped("letters", NO_MARKS)).toBe(5);
  expect(keysTyped("harakat", NO_MARKS)).toBe(7);
  expect(keysTyped("full", NO_MARKS)).toBe(8);
});

test("Auto asks for the marks the learner has unlocked: none gives 5 keys, all of them 8", () => {
  expect(keysTyped("auto", NO_MARKS)).toBe(5);
  expect(keysTyped("auto", ALL_MARKS)).toBe(8);
});

test("with Backspace correction on the wrong key waits as a mistake, with it off it is blocked", () => {
  const on = previewSession({ vocalization: "letters", unlockedMarks: NO_MARKS, requireBackspace: true });
  expect(view(on).mistakes).toBe("ب");
  const off = previewSession({ vocalization: "letters", unlockedMarks: NO_MARKS, requireBackspace: false });
  expect(view(off).mistakes).toBe("");
  expect(off.missed).toBe(true);
});
