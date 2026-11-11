import { expect, test } from "vitest";
import { FATHA, SHADDA } from "~/text/arabic.ts";
import { clampFontSize, FONT_SIZES, FONTS } from "./fonts.ts";
import { defaultSettings, sanitizeSettings } from "./settings.ts";

const ENGLISH = ["en"];
const DEFAULTS = {
  language: "en",
  font: "noto-naskh",
  fontSize: 40,
  vocalization: "auto",
  requireBackspace: true,
  customText: "",
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
    customText: "بسم الله",
  };
  expect(sanitizeSettings(saved, ENGLISH)).toEqual(saved);
});

test("three lesson fonts are offered, Noto Naskh Arabic first", () => {
  expect(FONTS.map((font) => [font.id, font.family])).toEqual([
    ["noto-naskh", "Noto Naskh Arabic"],
    ["scheherazade", "Scheherazade New"],
    ["amiri", "Amiri"],
  ]);
  expect(sanitizeSettings({ font: "comic-sans" }, ENGLISH).font).toBe("noto-naskh");
  expect(sanitizeSettings({ font: 3 }, ENGLISH).font).toBe("noto-naskh");
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

test("only a real false turns off correcting with Backspace", () => {
  expect(sanitizeSettings({ requireBackspace: false }, ENGLISH).requireBackspace).toBe(false);
  for (const junk of ["false", 0, null, "no", {}]) {
    expect(sanitizeSettings({ requireBackspace: junk }, ENGLISH).requireBackspace, String(junk)).toBe(true);
  }
});

test("saved custom text is prepared again, so it can never be over the limit or unprepared", () => {
  expect(sanitizeSettings({ customText: "  a\n b " }, ENGLISH).customText).toBe("a b");
  expect(sanitizeSettings({ customText: `ب${FATHA}${SHADDA}` }, ENGLISH).customText).toBe(`ب${SHADDA}${FATHA}`);
  expect(sanitizeSettings({ customText: "ب".repeat(9000) }, ENGLISH).customText).toHaveLength(5000);
  expect(sanitizeSettings({ customText: 5 }, ENGLISH).customText).toBe("");
});
