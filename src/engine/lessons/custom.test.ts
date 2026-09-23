import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_CUSTOM_TEXT,
  generateCustomLesson,
  inspectCustomText,
  MAX_CUSTOM_CHARS,
} from "~/engine/lessons/custom.ts";
import { countsTowardProgress } from "~/engine/lessons/lesson.ts";
import { chunkIntoLines } from "~/engine/session/lines.ts";

const PROSE =
  "وَإِنَّ قِيَامَنَا بِوَاجِبِنَا الَّذِي كَلَّفَنَا بِهِ رَبُّنَا فِي مُدَافَعَةِ هَذَا الْعَدُوِّ وَقِتَالِهِ. لَا يُعْفِي أُمَّةَ الْمِلْيَارَيْنِ مِنْ وَاجِبِهَا الَّذِي ضَيَّعَتْهُ لِلْأَسَفِ، وَأَمَامَ كُلِّ أَبْنَاءِ أُمَّتِنَا: أَمَا تَسْتَطِيعُ أُمَّةٌ كَبِيرَةٌ أَنْ تُوقِفَ ذَلِكَ؟";

test("the punctuation an Arabic keyboard can produce is never stripped", () => {
  const report = inspectCustomText(PROSE);
  assert.deepEqual(report.dropped, [], "nothing in this prose is untypeable");
  assert.deepEqual(report.lines, [PROSE]);

  const lesson = generateCustomLesson({ text: PROSE, tier: "full" });
  assert.equal(lesson.text, PROSE);
  for (const mark of [".", "،", ":", "؟"]) {
    assert.equal(lesson.text.includes(mark), true, `${mark} must survive`);
  }
});

test("punctuation survives every diacritics tier", () => {
  const sentence = "الْحَمْدُ لِلَّهِ، ثُمَّ مَاذَا؟";
  assert.equal(generateCustomLesson({ text: sentence, tier: "full" }).text, sentence);
  assert.equal(generateCustomLesson({ text: sentence, tier: "none" }).text, "الحمد لله، ثم ماذا؟");
});

test("plain Arabic becomes a lesson with no ayah marks", () => {
  const lesson = generateCustomLesson({ text: "الحمد لله", tier: "none" });
  assert.equal(lesson.text, "الحمد لله");
  assert.equal(lesson.source.kind, "custom");
  assert.deepEqual(lesson.ayat, []);
  assert.deepEqual(lesson.breaks, []);
  assert.equal(lesson.basmala, null);
});

test("a custom lesson never touches progress", () => {
  assert.equal(countsTowardProgress(generateCustomLesson({ text: "الحمد", tier: "none" }).source), false);
  assert.equal(countsTowardProgress({ kind: "adaptive" }), true);
  assert.equal(countsTowardProgress({ kind: "recite", surah: 112 }), true);
});

test("each line of the pasted text starts its own line in the lesson", () => {
  const lesson = generateCustomLesson({ text: "الحمد\nلله\nرب", tier: "none" });
  assert.equal(lesson.text, "الحمد لله رب");
  assert.deepEqual(lesson.breaks, [6, 10]);

  const lines = chunkIntoLines([...lesson.text], 999, lesson.breaks);
  assert.deepEqual(
    lines.map((line) => line.text.trim()),
    ["الحمد", "لله", "رب"],
  );
});

test("blank lines and stray whitespace collapse away", () => {
  const lesson = generateCustomLesson({ text: "  الحمد\t لله \n\n\n  رب  ", tier: "none" });
  assert.equal(lesson.text, "الحمد لله رب");
  assert.deepEqual(lesson.breaks, [10]);
});

test("characters the Arabic keyboard cannot produce are dropped and reported", () => {
  const report = inspectCustomText("الحمد hello ١٢٣ lله");
  assert.deepEqual(report.lines, ["الحمد له"]);
  assert.equal(report.dropped.includes("h"), true);
  assert.equal(report.dropped.includes("١"), true);
  assert.equal(report.dropped.includes(" "), false);

  const lesson = generateCustomLesson({ text: "الحمد hello", tier: "none" });
  assert.equal(lesson.text, "الحمد");
});

test("lam-alef ligatures are expanded the way the trainer types them", () => {
  const lesson = generateCustomLesson({ text: "ﻻ", tier: "none" });
  assert.equal(lesson.text, "لا");
});

test("the tier setting strips harakat from pasted text", () => {
  const vocalised = "بِسْمِ";
  assert.equal(generateCustomLesson({ text: vocalised, tier: "full" }).text, vocalised);
  assert.equal(generateCustomLesson({ text: vocalised, tier: "none" }).text, "بسم");
  assert.equal(generateCustomLesson({ text: vocalised, tier: "core" }).text, vocalised);
});

test("text with nothing typeable falls back to the sample rather than an empty lesson", () => {
  for (const raw of ["", "   \n\n ", "hello world", "١٢٣"]) {
    const lesson = generateCustomLesson({ text: raw, tier: "none" });
    assert.equal(lesson.text, generateCustomLesson({ text: DEFAULT_CUSTOM_TEXT, tier: "none" }).text);
    assert.equal(lesson.text.length > 0, true);
  }
});

test("a line of bare harakat cannot produce an empty line once the tier strips them", () => {
  const lesson = generateCustomLesson({ text: "الحمد\nًٌٍ\nلله", tier: "none" });
  assert.equal(lesson.text, "الحمد لله");
  assert.deepEqual(lesson.breaks, [6]);
});

test("an enormous paste is capped", () => {
  const report = inspectCustomText("ا ".repeat(MAX_CUSTOM_CHARS));
  assert.equal(report.length <= MAX_CUSTOM_CHARS, true);
});

test("the sample text is fully typeable", () => {
  const report = inspectCustomText(DEFAULT_CUSTOM_TEXT);
  assert.deepEqual(report.dropped, []);
  assert.deepEqual(report.lines, [DEFAULT_CUSTOM_TEXT]);
});
