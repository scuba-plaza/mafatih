import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clampFontSize,
  DEFAULT_FONT,
  DEFAULT_FONT_SIZE,
  FONT_SIZES,
  FONTS,
  fontStack,
  isFontId,
} from "~/engine/fonts.ts";

test("the default face is Noto Naskh Arabic", () => {
  assert.equal(DEFAULT_FONT, "naskh");
  assert.match(fontStack(DEFAULT_FONT), /Noto Naskh Arabic/);
  assert.equal(FONTS[0]?.id, DEFAULT_FONT);
});

test("every offered face is a known id with its own stack", () => {
  for (const font of FONTS) {
    assert.equal(isFontId(font.id), true);
    assert.notEqual(font.stack, "");
  }
  assert.equal(isFontId("helvetica"), false);
  assert.equal(isFontId(undefined), false);
});

test("the default font size is one of the offered steps", () => {
  assert.equal(FONT_SIZES.includes(DEFAULT_FONT_SIZE), true);
});

test("font sizes snap to an offered step", () => {
  for (const size of FONT_SIZES) {
    assert.equal(clampFontSize(size), size);
    assert.equal(clampFontSize(String(size)), size);
  }
  assert.equal(clampFontSize(33), 32);
  assert.equal(clampFontSize(1000), FONT_SIZES[FONT_SIZES.length - 1]);
  assert.equal(clampFontSize(0), FONT_SIZES[0]);
});

test("a corrupt font size falls back to the default", () => {
  assert.equal(clampFontSize(Number.NaN), DEFAULT_FONT_SIZE);
  assert.equal(clampFontSize("huge"), DEFAULT_FONT_SIZE);
  assert.equal(clampFontSize(undefined), DEFAULT_FONT_SIZE);
});
