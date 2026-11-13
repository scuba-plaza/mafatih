import { expect, test } from "vitest";
import { surahOrder } from "./order.ts";

test("the mushaf order is 1 to 114", () => {
  expect(surahOrder("mushaf")).toEqual(Array.from({ length: 114 }, (_, index) => index + 1));
});

test("the Juz Amma order starts with the short surahs from the end, then goes on from the beginning", () => {
  const order = surahOrder("juz-amma");
  expect(order.slice(0, 4)).toEqual([114, 113, 112, 111]);
  expect(order.slice(35, 40)).toEqual([79, 78, 1, 2, 3]);
  expect(order.at(-1)).toBe(77);
  expect(new Set(order).size).toBe(114);
  expect(order).toHaveLength(114);
});
