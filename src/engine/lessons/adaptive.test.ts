import assert from "node:assert/strict";
import { test } from "node:test";
import { letterOrder } from "~/engine/corpus/corpus.ts";
import { skeleton } from "~/engine/corpus/normalize.ts";
import { HARAKAT, TANWEEN, TYPEABLE } from "~/engine/layout/ara.ts";
import { candidateWords, generateAdaptiveLesson } from "~/engine/lessons/adaptive.ts";

test("the same seed produces the same lesson", () => {
  const opts = { unlockedCount: 10, tier: "core" as const, seed: 1234 };
  assert.equal(generateAdaptiveLesson(opts).text, generateAdaptiveLesson(opts).text);
});

test("different seeds produce different lessons", () => {
  const a = generateAdaptiveLesson({ unlockedCount: 12, tier: "full", seed: 1 });
  const b = generateAdaptiveLesson({ unlockedCount: 12, tier: "full", seed: 2 });
  assert.notEqual(a.text, b.text);
});

test("a lesson never uses a letter that is still locked", () => {
  for (const unlockedCount of [6, 8, 10, 15, 20, 36]) {
    const allowed = new Set(letterOrder.slice(0, unlockedCount));
    for (let seed = 0; seed < 25; seed += 1) {
      const { text } = generateAdaptiveLesson({ unlockedCount, tier: "full", seed });
      for (const char of skeleton(text)) {
        if (char === " ") {
          continue;
        }
        assert.ok(allowed.has(char), `locked letter ${JSON.stringify(char)} at unlockedCount=${unlockedCount}`);
      }
    }
  }
});

test("a lesson only ever contains typeable characters", () => {
  for (let seed = 0; seed < 25; seed += 1) {
    const { text } = generateAdaptiveLesson({ unlockedCount: 36, tier: "full", seed });
    for (const char of text) {
      assert.ok(TYPEABLE.has(char), `untypeable ${JSON.stringify(char)}`);
    }
  }
});

test("tier none yields no harakat and tier core yields no tanween", () => {
  const none = generateAdaptiveLesson({ unlockedCount: 15, tier: "none", seed: 9 }).text;
  for (const char of none) {
    assert.ok(!HARAKAT.has(char), `tier none leaked ${JSON.stringify(char)}`);
  }
  const core = generateAdaptiveLesson({ unlockedCount: 15, tier: "core", seed: 9 }).text;
  for (const char of core) {
    assert.ok(!TANWEEN.has(char), `tier core leaked ${JSON.stringify(char)}`);
  }
});

test("the focus letter is over-represented compared to no focus", () => {
  const focusLetter = letterOrder[9];
  assert.ok(focusLetter);
  const count = (text: string): number => [...skeleton(text)].filter((c) => c === focusLetter).length;
  let withFocus = 0;
  let without = 0;
  for (let seed = 0; seed < 40; seed += 1) {
    withFocus += count(generateAdaptiveLesson({ unlockedCount: 10, tier: "none", seed, focusLetter }).text);
    without += count(generateAdaptiveLesson({ unlockedCount: 10, tier: "none", seed }).text);
  }
  assert.ok(withFocus > without, `focus=${withFocus} vs none=${without}`);
});

test("lessons reach roughly the requested length", () => {
  for (let seed = 0; seed < 10; seed += 1) {
    const { text } = generateAdaptiveLesson({ unlockedCount: 20, tier: "full", seed, targetLength: 40 });
    assert.ok(text.length >= 30, `too short: ${text.length}`);
    assert.ok(text.length <= 80, `too long: ${text.length}`);
  }
});

test("the candidate pool grows as letters unlock", () => {
  const sizes = [6, 8, 10, 15, 20, 36].map((n) => candidateWords(n).length);
  for (let i = 1; i < sizes.length; i += 1) {
    const prev = sizes[i - 1];
    const curr = sizes[i];
    assert.ok(prev !== undefined && curr !== undefined && curr > prev, `pool did not grow: ${sizes.join(",")}`);
  }
  assert.equal(sizes[0], 190);
  assert.equal(sizes[sizes.length - 1], 18198);
});

test("an empty alphabet is rejected rather than looping forever", () => {
  assert.throws(() => generateAdaptiveLesson({ unlockedCount: 0, tier: "none", seed: 1 }), /no words available/);
});
