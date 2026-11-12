import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { ar } from "~/i18n/ar.ts";
import { en } from "~/i18n/en.ts";
import { RECITERS } from "~/recitation/audio/reciters.ts";
import { CREDITS, WORD_LIST_DATE } from "./credits.ts";

test("the extract date shown for the word list is the one written in its sources file", () => {
  const sources = readFileSync("data/practice/SOURCES.md", "utf8");
  const built = sources.match(/built (\d{4}-\d{2}-\d{2})\)/)?.[1];
  expect(built).toBeDefined();
  expect(new Date(WORD_LIST_DATE).toISOString().slice(0, 10)).toBe(built);
});

test("the audio credit names the reciter and both recitations exactly as the player does", () => {
  expect(RECITERS).toHaveLength(2);
  for (const reciter of RECITERS) {
    expect(en["about.audioNote"]).toContain(reciter.name);
    expect(en["about.audioNote"]).toContain(reciter.style);
    expect(ar["about.audioNote"]).toContain(reciter.nameAr);
    expect(ar["about.audioNote"]).toContain(reciter.styleAr);
  }
});

test("every credit links to a secure address, and no address is listed twice", () => {
  const addresses = CREDITS.flatMap((credit) => credit.links.map((link) => link.href));
  expect(addresses.length).toBeGreaterThanOrEqual(7);
  expect(new Set(addresses).size).toBe(addresses.length);
  for (const address of addresses) {
    expect(address.startsWith("https://"), address).toBe(true);
  }
});
