import assert from "node:assert/strict";
import { test } from "node:test";
import { hrefOf, PAGE_ROUTE, parseRoute, targetOf } from "~/hooks/useRoute.ts";

test("every page has its own address", () => {
  assert.deepEqual(parseRoute(""), PAGE_ROUTE.practice);
  assert.deepEqual(parseRoute("#/"), PAGE_ROUTE.practice);
  assert.deepEqual(parseRoute("#/stats"), PAGE_ROUTE.stats);
  assert.deepEqual(parseRoute("#/custom"), PAGE_ROUTE.custom);
  assert.deepEqual(parseRoute("#/recitation"), PAGE_ROUTE.recitation);
  assert.deepEqual(parseRoute("#/nowhere"), PAGE_ROUTE.practice);
});

test("a recitation level is addressed by surah and ayah", () => {
  assert.deepEqual(parseRoute("#/recitation/36/21"), { page: "recitation", surah: 36, ayah: 21 });
  assert.deepEqual(parseRoute("#/recitation/36"), { page: "recitation", surah: 36, ayah: null });
  assert.deepEqual(parseRoute("#/recitation/x/2"), PAGE_ROUTE.recitation);
  assert.deepEqual(parseRoute("#/recitation/2/0"), { page: "recitation", surah: 2, ayah: null });
});

test("addresses round-trip", () => {
  for (const hash of ["#/", "#/stats", "#/custom", "#/recitation", "#/recitation/36", "#/recitation/36/21"]) {
    assert.equal(hrefOf(parseRoute(hash)), hash);
  }
});

test("the page decides the mode, and the surah map types nothing", () => {
  assert.deepEqual(targetOf(PAGE_ROUTE.practice), { mode: "adaptive" });
  assert.deepEqual(targetOf(PAGE_ROUTE.custom), { mode: "custom" });
  assert.equal(targetOf(PAGE_ROUTE.stats), null);
  assert.equal(targetOf(PAGE_ROUTE.recitation), null);
  assert.deepEqual(targetOf(parseRoute("#/recitation/2/5")), { mode: "recite", surah: 2, ayah: 5 });
});
