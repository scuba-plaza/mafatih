import { expect, test } from "vitest";
import { formatRoute, parseRoute } from "./routes.ts";

const HOME = { page: "recitation", surah: null, ayah: null };

test("an empty or root hash is Recitation, the default page", () => {
  expect(parseRoute("")).toEqual(HOME);
  expect(parseRoute("#")).toEqual(HOME);
  expect(parseRoute("#/")).toEqual(HOME);
});

test("a recitation address names a surah and optionally an ayah", () => {
  expect(parseRoute("#/recitation")).toEqual(HOME);
  expect(parseRoute("#/recitation/36")).toEqual({ page: "recitation", surah: 36, ayah: null });
  expect(parseRoute("#/recitation/36/21")).toEqual({ page: "recitation", surah: 36, ayah: 21 });
  expect(parseRoute("#/recitation/114/6/")).toEqual({ page: "recitation", surah: 114, ayah: 6 });
});

test("a surah outside 1 to 114 falls back to the surah map", () => {
  expect(parseRoute("#/recitation/0")).toEqual(HOME);
  expect(parseRoute("#/recitation/115")).toEqual(HOME);
  expect(parseRoute("#/recitation/36abc")).toEqual(HOME);
  expect(parseRoute("#/recitation/3.5")).toEqual(HOME);
});

test("an ayah that is not a positive whole number is dropped, the surah is kept", () => {
  expect(parseRoute("#/recitation/36/0")).toEqual({ page: "recitation", surah: 36, ayah: null });
  expect(parseRoute("#/recitation/36/x")).toEqual({ page: "recitation", surah: 36, ayah: null });
  expect(parseRoute("#/recitation/36/-2")).toEqual({ page: "recitation", surah: 36, ayah: null });
});

test("the other pages have one address each", () => {
  expect(parseRoute("#/practice")).toEqual({ page: "practice" });
  expect(parseRoute("#/custom")).toEqual({ page: "custom" });
  expect(parseRoute("#/stats")).toEqual({ page: "stats" });
  expect(parseRoute("#/about")).toEqual({ page: "about" });
  expect(parseRoute("#/practice/")).toEqual({ page: "practice" });
});

test("an unknown address is Recitation", () => {
  expect(parseRoute("#/nope")).toEqual(HOME);
  expect(parseRoute("#main")).toEqual(HOME);
  expect(parseRoute("#/practice/extra")).toEqual(HOME);
  expect(parseRoute("#/constructor")).toEqual(HOME);
});

test("a route is written as its address", () => {
  expect(formatRoute({ page: "recitation", surah: null, ayah: null })).toBe("#/");
  expect(formatRoute({ page: "recitation", surah: 36, ayah: null })).toBe("#/recitation/36");
  expect(formatRoute({ page: "recitation", surah: 36, ayah: 21 })).toBe("#/recitation/36/21");
  expect(formatRoute({ page: "recitation", surah: null, ayah: 21 })).toBe("#/");
  expect(formatRoute({ page: "practice" })).toBe("#/practice");
  expect(formatRoute({ page: "custom" })).toBe("#/custom");
  expect(formatRoute({ page: "stats" })).toBe("#/stats");
  expect(formatRoute({ page: "about" })).toBe("#/about");
});
