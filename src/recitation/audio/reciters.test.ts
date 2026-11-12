import { expect, test } from "vitest";
import { buildPassage } from "../passage.ts";
import { loadSurah } from "../quran.ts";
import { audioSequence, ayahAudioUrl, DEFAULT_RECITER, isReciterId, RECITERS, reciterOf } from "./reciters.ts";

const NO_MARKS: ReadonlySet<string> = new Set();

test("the URL of an ayah is the reciter's folder, then the surah and the ayah as three digits each", () => {
  expect(ayahAudioUrl("murattal", 1, 1)).toBe("https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/001001.mp3");
  expect(ayahAudioUrl("murattal", 114, 6)).toBe("https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/114006.mp3");
  expect(ayahAudioUrl("mujawwad", 2, 255)).toBe("https://everyayah.com/data/Abdul_Basit_Mujawwad_128kbps/002255.mp3");
});

test("two reciters are offered, the measured Murattal one first and by default", () => {
  expect(RECITERS.map((reciter) => [reciter.id, reciter.style, reciter.kbps])).toEqual([
    ["murattal", "Murattal", 64],
    ["mujawwad", "Mujawwad", 128],
  ]);
  expect(DEFAULT_RECITER).toBe("murattal");
  expect(reciterOf("mujawwad").folder).toBe("Abdul_Basit_Mujawwad_128kbps");
  expect(isReciterId("murattal")).toBe(true);
  for (const junk of ["", "other", "toString", 3, null, undefined]) {
    expect(isReciterId(junk), String(junk)).toBe(false);
  }
});

test("a passage that opens a surah with a basmala starts with the clip of 1:1, then one clip per ayah", async () => {
  const passage = buildPassage(await loadSurah(2), 1, 3, NO_MARKS);
  const clips = audioSequence(passage);
  expect(clips.map((clip) => [clip.surah, clip.ayah])).toEqual([
    [1, 1],
    [2, 1],
    [2, 2],
    [2, 3],
  ]);
  expect(clips[0]?.span).toEqual(passage.basmala);
  expect(clips.slice(1).map((clip) => clip.span)).toEqual(passage.ayat.map(({ start, end }) => ({ start, end })));
});

test("the opening surah is its own basmala, and surah 9 has none: neither gets an extra clip", async () => {
  const fatiha = audioSequence(buildPassage(await loadSurah(1), 1, 2, NO_MARKS));
  expect(fatiha.map((clip) => [clip.surah, clip.ayah])).toEqual([
    [1, 1],
    [1, 2],
  ]);
  const tawba = audioSequence(buildPassage(await loadSurah(9), 1, 2, NO_MARKS));
  expect(tawba.map((clip) => [clip.surah, clip.ayah])).toEqual([
    [9, 1],
    [9, 2],
  ]);
});

test("a passage that starts later in a surah has no basmala clip", async () => {
  const clips = audioSequence(buildPassage(await loadSurah(36), 21, 2, NO_MARKS));
  expect(clips.map((clip) => [clip.surah, clip.ayah])).toEqual([
    [36, 21],
    [36, 22],
  ]);
});
