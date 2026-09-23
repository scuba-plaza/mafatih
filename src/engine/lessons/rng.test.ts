import assert from "node:assert/strict";
import { test } from "node:test";
import { createRng } from "~/engine/lessons/rng.ts";

test("the same seed produces the same stream", () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i += 1) {
    assert.equal(a.next(), b.next());
  }
});

test("different seeds diverge", () => {
  const a = createRng(1);
  const b = createRng(2);
  const left = Array.from({ length: 20 }, () => a.next());
  const right = Array.from({ length: 20 }, () => b.next());
  assert.notDeepEqual(left, right);
});

test("values stay in [0, 1)", () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i += 1) {
    const v = rng.next();
    assert.ok(v >= 0 && v < 1, `out of range: ${v}`);
  }
});

test("int stays in range and a zero seed still works", () => {
  const rng = createRng(0);
  for (let i = 0; i < 200; i += 1) {
    const v = rng.int(5);
    assert.ok(Number.isInteger(v) && v >= 0 && v < 5);
  }
});

test("weighted picking respects a dominant weight", () => {
  const rng = createRng(3);
  const items = ["rare", "common"];
  const counts = { rare: 0, common: 0 };
  for (let i = 0; i < 500; i += 1) {
    counts[rng.weighted(items, (x) => (x === "common" ? 99 : 1)) as "rare" | "common"] += 1;
  }
  assert.ok(counts.common > counts.rare * 10, `expected dominance, got ${JSON.stringify(counts)}`);
});
