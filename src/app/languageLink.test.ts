import { expect, test, vi } from "vitest";
import { takeLanguageFromAddress } from "./languageLink.ts";

function address(search: string, hash = "") {
  const replaceState = vi.fn();
  return { place: { search, pathname: "/app/", hash }, history: { state: null, replaceState }, replaceState };
}

test("a language in the address is returned and removed from it, keeping the path, the other parameters and the hash", () => {
  const { place, history, replaceState } = address("?lang=ar&x=1", "#/practice");
  expect(takeLanguageFromAddress(place, history)).toBe("ar");
  expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/app/?x=1#/practice");
});

test("when the language was the only parameter no question mark is left", () => {
  const { place, history, replaceState } = address("?lang=en", "#/recitation/36/1");
  expect(takeLanguageFromAddress(place, history)).toBe("en");
  expect(replaceState).toHaveBeenCalledExactlyOnceWith(null, "", "/app/#/recitation/36/1");
});

test("an address without a language, or with one that is not offered, is left exactly as it is", () => {
  for (const search of ["", "?x=1", "?lang=fr", "?lang="]) {
    const { place, history, replaceState } = address(search, "#/stats");
    expect(takeLanguageFromAddress(place, history), search).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  }
});
