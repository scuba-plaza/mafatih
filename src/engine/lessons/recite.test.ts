import assert from "node:assert/strict";
import { test } from "node:test";
import { BASMALA, BASMALA_TEXT, opensWithBasmala } from "~/engine/corpus/corpus.ts";
import { stripToTier } from "~/engine/corpus/normalize.ts";
import { clampAyatPerLesson, DEFAULT_AYAT_PER_LESSON } from "~/engine/lessons/lesson.ts";
import { generateRecitePassage } from "~/engine/lessons/recite.ts";
import { chunkIntoLines } from "~/engine/session/lines.ts";

test("every ayah span addresses exactly its own text in the passage", () => {
  for (const surah of [1, 2, 9, 108, 112]) {
    const lesson = generateRecitePassage({ surah, tier: "none" });
    const chars = [...lesson.text];
    assert.equal(lesson.ayat.length > 0, true, `surah ${surah} yielded no spans`);
    for (const span of lesson.ayat) {
      assert.equal(span.end > span.start, true);
      const slice = chars.slice(span.start, span.end).join("");
      assert.equal(slice.startsWith(" "), false);
      assert.equal(slice.endsWith(" "), false);
    }
    const last = lesson.ayat[lesson.ayat.length - 1];
    assert.equal(last?.end, chars.length);
    assert.equal(lesson.ayat[0]?.start, lesson.basmala?.standalone === true ? lesson.basmala.end + 1 : 0);
    assert.deepEqual(
      lesson.ayat.map((s) => s.ayah),
      lesson.ayat.map((_, i) => (lesson.source.fromAyah ?? 1) + i),
    );
  }
});

test("spans are contiguous, separated by the single joining space", () => {
  const lesson = generateRecitePassage({ surah: 112, tier: "full" });
  const chars = [...lesson.text];
  for (let i = 1; i < lesson.ayat.length; i += 1) {
    const previous = lesson.ayat[i - 1];
    const current = lesson.ayat[i];
    assert.equal(current?.start, (previous?.end ?? 0) + 1);
    assert.equal(chars[previous?.end ?? 0], " ");
  }
});

test("the basmala is lifted out of ayah one, never folded into it", () => {
  const baqara = generateRecitePassage({ surah: 2, tier: "none" });
  const chars = [...baqara.text];
  assert.equal(baqara.basmala?.standalone, true);
  assert.equal(chars.slice(baqara.basmala?.start, baqara.basmala?.end).join(""), BASMALA);
  const first = baqara.ayat[0];
  assert.equal(chars.slice(first?.start, first?.end).join(""), "الم");
  assert.equal(first?.start, (baqara.basmala?.end ?? 0) + 1);

  const tawba = generateRecitePassage({ surah: 9, tier: "none" });
  assert.equal(tawba.basmala, null);

  const fatiha = generateRecitePassage({ surah: 1, tier: "none" });
  assert.equal(fatiha.basmala?.standalone, false, "1:1 is the basmala, so it is an ayah, not a standalone");
  assert.equal(fatiha.ayat[0]?.start, fatiha.basmala?.start);
  assert.equal(fatiha.ayat[0]?.end, fatiha.basmala?.end);
});

test("every ayah span is exactly the text its own audio file recites", () => {
  for (const surah of [1, 2, 9, 108, 112]) {
    const lesson = generateRecitePassage({ surah, tier: "none" });
    const chars = [...lesson.text];
    for (const span of lesson.ayat) {
      const shown = chars.slice(span.start, span.end).join("");
      assert.equal(shown.includes(BASMALA), surah === 1 && span.ayah === 1, `${surah}:${span.ayah}`);
    }
  }
});

test("the basmala is detected as a prefix, not merely as a substring", () => {
  assert.equal(opensWithBasmala(`${BASMALA} الم`), true);
  assert.equal(opensWithBasmala(BASMALA), false);
  assert.equal(opensWithBasmala(`إنه من سليمان وإنه ${BASMALA}`), false);
});

test("the basmala is always given a line of its own", () => {
  for (const tier of ["none", "core", "full"] as const) {
    for (const surah of [2, 112]) {
      const lesson = generateRecitePassage({ surah, tier });
      const chars = [...lesson.text];
      assert.equal(lesson.breaks.length, 1, `surah ${surah} at ${tier}`);
      const at = lesson.breaks[0] ?? 0;
      assert.equal(chars.slice(0, at - 1).join(""), stripToTier(BASMALA_TEXT, tier));
      assert.equal(chars[at - 1], " ");
    }
  }
});

test("a surah without a basmala forces no break", () => {
  assert.deepEqual(generateRecitePassage({ surah: 9, tier: "none" }).breaks, []);
});

test("al-Fatiha breaks after its first ayah, which is the basmala", () => {
  const lesson = generateRecitePassage({ surah: 1, tier: "none" });
  assert.equal(lesson.breaks.length, 1);
  assert.equal(lesson.breaks[0], (lesson.ayat[0]?.end ?? 0) + 1);
});

test("a forced break puts the basmala alone on the first rendered line", () => {
  const lesson = generateRecitePassage({ surah: 2, tier: "full" });
  const lines = chunkIntoLines([...lesson.text], 52, lesson.breaks);
  assert.equal(lines[0]?.text.trimEnd(), stripToTier(BASMALA_TEXT, "full"));
  assert.equal(lines.length > 1, true);
});

test("without the forced break the basmala would have shared a line", () => {
  const lesson = generateRecitePassage({ surah: 2, tier: "full" });
  const loose = chunkIntoLines([...lesson.text], 52);
  assert.notEqual(loose[0]?.text.trimEnd(), stripToTier(BASMALA_TEXT, "full"));
});

test("a passage carries exactly the number of ayat asked for", () => {
  for (const count of [1, 2, 3, 5, 10, 20]) {
    const lesson = generateRecitePassage({ surah: 2, tier: "none", maxAyat: count });
    assert.equal(lesson.ayat.length, count, `surah 2 with maxAyat ${count}`);
    assert.equal(lesson.source.toAyah, count);
  }
});

test("a surah shorter than the limit ends where the surah ends", () => {
  const lesson = generateRecitePassage({ surah: 112, tier: "none", maxAyat: 20 });
  assert.equal(lesson.ayat.length, 4);
  assert.equal(lesson.source.toAyah, 4);
});

test("the count defaults and survives nonsense", () => {
  assert.equal(clampAyatPerLesson(4), 4);
  assert.equal(clampAyatPerLesson(0), 1);
  assert.equal(clampAyatPerLesson(500), 20);
  assert.equal(clampAyatPerLesson(7), 6);
  assert.equal(clampAyatPerLesson("lots"), DEFAULT_AYAT_PER_LESSON);
  assert.equal(clampAyatPerLesson(undefined), DEFAULT_AYAT_PER_LESSON);
  assert.equal(generateRecitePassage({ surah: 2, tier: "none" }).ayat.length, DEFAULT_AYAT_PER_LESSON);
});

test("the basmala does not eat into the ayah budget", () => {
  const withBasmala = generateRecitePassage({ surah: 2, tier: "none", maxAyat: 3 });
  const without = generateRecitePassage({ surah: 9, tier: "none", maxAyat: 3 });
  assert.equal(withBasmala.ayat.length, 3);
  assert.equal(without.ayat.length, 3);
  assert.equal(withBasmala.basmala?.standalone, true);
  assert.equal(without.basmala, null);
});
