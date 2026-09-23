import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ayahMark,
  END_OF_AYAH,
  formatBytes,
  formatNumber,
  formatPercent,
  formatSeconds,
  toArabicDigits,
} from "~/engine/format.ts";

test("formats whole numbers and fixed decimals", () => {
  assert.equal(formatNumber(120), "120");
  assert.equal(formatNumber(119.6), "120");
  assert.equal(formatNumber(1.25, 1), "1.3");
  assert.equal(formatNumber(0), "0");
});

test("non-finite values degrade to zero instead of NaN or Infinity", () => {
  assert.equal(formatNumber(Number.NaN), "0");
  assert.equal(formatNumber(Number.POSITIVE_INFINITY), "0");
  assert.equal(formatNumber(Number.NEGATIVE_INFINITY), "0");
  assert.equal(formatNumber(Number.NaN, 1), "0.0");
  assert.equal(formatSeconds(Number.NaN), "0.0s");
  assert.equal(formatPercent(Number.NaN), "0%");
});

test("rounds accuracy to a whole percent", () => {
  assert.equal(formatPercent(0.8765), "88%");
  assert.equal(formatPercent(1), "100%");
  assert.equal(formatPercent(0), "0%");
});

test("renders elapsed time to a tenth of a second", () => {
  assert.equal(formatSeconds(0), "0.0s");
  assert.equal(formatSeconds(60000), "60.0s");
  assert.equal(formatSeconds(1234), "1.2s");
});

test("formats cache sizes in the largest unit that keeps them readable", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(-5), "0 B");
  assert.equal(formatBytes(Number.NaN), "0 B");
  assert.equal(formatBytes(900), "900 B");
  assert.equal(formatBytes(1024), "1.0 KB");
  assert.equal(formatBytes(64_000), "62.5 KB");
  assert.equal(formatBytes(13_000_000), "12.4 MB");
  assert.equal(formatBytes(5_000_000_000), "4.7 GB");
});

test("ayah numbers render in Arabic-Indic digits behind the end-of-ayah sign", () => {
  assert.equal(toArabicDigits(1), "١");
  assert.equal(toArabicDigits(286), "٢٨٦");
  assert.equal(toArabicDigits(10), "١٠");
  assert.equal(toArabicDigits(-1), "");
  assert.equal(toArabicDigits(Number.NaN), "");
  assert.equal(ayahMark(3), `${END_OF_AYAH}٣`);
  assert.equal([...ayahMark(3)][0], END_OF_AYAH);
});
