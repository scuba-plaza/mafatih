import { expect, test } from "vitest";
import { FATHA, SHADDA } from "~/text/arabic.ts";
import { clampFontSize, FONT_SIZES, FONTS } from "./fonts.ts";
import { AYAT_PER_PASSAGE, defaultSettings, sanitizeSettings } from "./settings.ts";

const ENGLISH = ["en"];
const DEFAULTS = {
  language: "en",
  font: "scheherazade",
  fontSize: 40,
  vocalization: "auto",
  requireBackspace: true,
  showKeyboard: true,
  fingerGuide: true,
  keyLabels: true,
  delayedHint: false,
  customText: "",
  ayatPerLesson: 4,
  surahOrder: "mushaf",
  reciter: "murattal",
  volume: 0.8,
  muted: false,
  playWhole: true,
  loop: true,
};

test("the defaults: errors must be corrected with Backspace, vocalization follows progress", () => {
  expect(defaultSettings(ENGLISH)).toEqual(DEFAULTS);
  expect(sanitizeSettings(undefined, ENGLISH)).toEqual(DEFAULTS);
  expect(sanitizeSettings({}, ENGLISH)).toEqual(DEFAULTS);
});

test("valid saved settings are kept", () => {
  const saved = {
    language: "ar",
    font: "amiri",
    fontSize: 56,
    vocalization: "full",
    requireBackspace: false,
    showKeyboard: false,
    fingerGuide: false,
    keyLabels: false,
    delayedHint: true,
    customText: "بسم الله",
    ayatPerLesson: 3,
    surahOrder: "juz-amma",
    reciter: "mujawwad",
    volume: 0.35,
    muted: true,
    playWhole: true,
    loop: true,
  };
  expect(sanitizeSettings(saved, ENGLISH)).toEqual(saved);
});

test("three lesson fonts are offered, Scheherazade New first and the default", () => {
  expect(FONTS.map((font) => [font.id, font.family])).toEqual([
    ["scheherazade", "Scheherazade New"],
    ["amiri", "Amiri"],
    ["noto-naskh", "Noto Naskh Arabic"],
  ]);
  expect(sanitizeSettings({ font: "comic-sans" }, ENGLISH).font).toBe("scheherazade");
  expect(sanitizeSettings({ font: 3 }, ENGLISH).font).toBe("scheherazade");
  expect(sanitizeSettings({ font: "noto-naskh" }, ENGLISH).font).toBe("noto-naskh");
});

test("the lesson text size is one of nine steps from 28 to 72 pixels", () => {
  expect(FONT_SIZES).toEqual([28, 32, 36, 40, 44, 48, 56, 64, 72]);
  expect(clampFontSize(41)).toBe(40);
  expect(clampFontSize(43)).toBe(44);
  expect(clampFontSize(5)).toBe(28);
  expect(clampFontSize(1000)).toBe(72);
  for (const junk of ["40", null, undefined, Number.NaN, Number.POSITIVE_INFINITY, {}]) {
    expect(clampFontSize(junk), String(junk)).toBe(40);
  }
  expect(sanitizeSettings({ fontSize: 62 }, ENGLISH).fontSize).toBe(64);
});

test("an unknown vocalization level falls back to auto", () => {
  for (const level of ["auto", "letters", "harakat", "full"]) {
    expect(sanitizeSettings({ vocalization: level }, ENGLISH).vocalization).toBe(level);
  }
  expect(sanitizeSettings({ vocalization: "everything" }, ENGLISH).vocalization).toBe("auto");
  expect(sanitizeSettings({ vocalization: 1 }, ENGLISH).vocalization).toBe("auto");
});

test("saved custom text is prepared again, so it can never be over the limit or unprepared", () => {
  expect(sanitizeSettings({ customText: "  a\n b " }, ENGLISH).customText).toBe("a b");
  expect(sanitizeSettings({ customText: `ب${FATHA}${SHADDA}` }, ENGLISH).customText).toBe(`ب${SHADDA}${FATHA}`);
  expect(sanitizeSettings({ customText: "ب".repeat(9000) }, ENGLISH).customText).toHaveLength(5000);
  expect(sanitizeSettings({ customText: 5 }, ENGLISH).customText).toBe("");
});

test("a passage holds one to four ayat: more snaps down to four, fractions round, a non-number falls back to four", () => {
  const perLesson = (value: unknown) => sanitizeSettings({ ayatPerLesson: value }, ENGLISH).ayatPerLesson;
  expect(AYAT_PER_PASSAGE).toEqual([1, 2, 3, 4]);
  expect(AYAT_PER_PASSAGE.map(perLesson)).toEqual([1, 2, 3, 4]);
  expect([5, 8, 20, 400, Number.POSITIVE_INFINITY].map(perLesson)).toEqual([4, 4, 4, 4, 4]);
  expect([0, -3, Number.NEGATIVE_INFINITY].map(perLesson)).toEqual([1, 1, 1]);
  expect([1.4, 2.7, 3.4].map(perLesson)).toEqual([1, 3, 3]);
  expect(["5", null, Number.NaN, undefined, {}].map(perLesson)).toEqual([4, 4, 4, 4, 4]);
});

test("the surah order is the mushaf order unless Juz Amma first was chosen", () => {
  const order = (value: unknown) => sanitizeSettings({ surahOrder: value }, ENGLISH).surahOrder;
  expect(["mushaf", "juz-amma", "random", 3, undefined].map(order)).toEqual([
    "mushaf",
    "juz-amma",
    "mushaf",
    "mushaf",
    "mushaf",
  ]);
});

test("the reciter is one of the two offered, Murattal otherwise", () => {
  const reciter = (value: unknown) => sanitizeSettings({ reciter: value }, ENGLISH).reciter;
  expect(["murattal", "mujawwad"].map(reciter)).toEqual(["murattal", "mujawwad"]);
  expect(["other", "", 3, null, undefined, "toString"].map(reciter)).toEqual(Array(6).fill("murattal"));
});

test("the volume is a number from nothing to full, brought into range, and 80 percent when it is not a number", () => {
  const volume = (value: unknown) => sanitizeSettings({ volume: value }, ENGLISH).volume;
  expect([0, 0.35, 1].map(volume)).toEqual([0, 0.35, 1]);
  expect([-1, 2, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map(volume)).toEqual([0, 1, 1, 0]);
  expect(["0.5", null, Number.NaN, undefined, {}].map(volume)).toEqual([0.8, 0.8, 0.8, 0.8, 0.8]);
});

test.each(["requireBackspace", "showKeyboard", "fingerGuide", "keyLabels", "playWhole", "loop"] as const)(
  "%s stays on unless a saved false turns it off",
  (name) => {
    const read = (value: unknown) => sanitizeSettings({ [name]: value }, ENGLISH)[name];
    expect(read(false)).toBe(false);
    for (const value of [true, "false", 0, null, "no", {}, undefined]) {
      expect(read(value), String(value)).toBe(true);
    }
  },
);

test.each(["delayedHint", "muted"] as const)("%s stays off unless a saved true turns it on", (name) => {
  const read = (value: unknown) => sanitizeSettings({ [name]: value }, ENGLISH)[name];
  expect(read(true)).toBe(true);
  for (const value of [false, "true", "yes", 1, null, {}, undefined]) {
    expect(read(value), String(value)).toBe(false);
  }
});
