import assert from "node:assert/strict";
import { test } from "node:test";
import {
  ayahAudioUrl,
  clampVolume,
  DEFAULT_RECITER,
  DEFAULT_VOLUME,
  firstClipOf,
  isReciterId,
  passageClips,
  RECITERS,
  reciterOption,
} from "~/engine/audio/reciters.ts";

test("the default set is Abdul Basit murattal", () => {
  assert.equal(DEFAULT_RECITER, "murattal");
  assert.equal(RECITERS[0]?.id, DEFAULT_RECITER);
  assert.equal(reciterOption(DEFAULT_RECITER).style, "Murattal");
  assert.equal(reciterOption(DEFAULT_RECITER).kbps, 64);
});

test("every offered set names a reciter, a style and a bitrate", () => {
  for (const reciter of RECITERS) {
    assert.equal(isReciterId(reciter.id), true);
    assert.notEqual(reciter.name, "");
    assert.notEqual(reciter.style, "");
    assert.equal(Number.isInteger(reciter.kbps) && reciter.kbps > 0, true);
    assert.notEqual(reciter.folder, "");
  }
});

test("ayah urls are zero-padded to three digits each", () => {
  assert.match(ayahAudioUrl("murattal", 1, 1), /\/Abdul_Basit_Murattal_64kbps\/001001\.mp3$/);
  assert.match(ayahAudioUrl("murattal", 114, 6), /\/Abdul_Basit_Murattal_64kbps\/114006\.mp3$/);
  assert.match(ayahAudioUrl("mujawwad", 2, 255), /\/Abdul_Basit_Mujawwad_128kbps\/002255\.mp3$/);
});

test("an unknown id falls back to the default set rather than a broken url", () => {
  assert.equal(isReciterId("abdulbasit"), false);
  assert.equal(isReciterId(null), false);
  assert.equal(isReciterId({}), false);
  assert.equal(isReciterId("murattal"), true);
  assert.equal(reciterOption("nope" as never).id, DEFAULT_RECITER);
});

test("a passage plays exactly one clip per ayah", () => {
  const clips = passageClips("murattal", 112, [{ ayah: 2 }, { ayah: 3 }]);
  assert.deepEqual(
    clips.map((c) => c.ayah),
    [2, 3],
  );
  assert.match(clips[0]?.url ?? "", /112002\.mp3$/);
  assert.equal(
    clips.every((c) => !c.basmala),
    true,
  );
});

test("a passage that shows a standalone basmala leads with its own clip", () => {
  const clips = passageClips("murattal", 112, [{ ayah: 1 }, { ayah: 2 }], true);
  assert.deepEqual(
    clips.map((c) => c.ayah),
    [null, 1, 2],
  );
  assert.equal(clips[0]?.basmala, true);
  assert.match(clips[0]?.url ?? "", /001001\.mp3$/);
  assert.match(clips[1]?.url ?? "", /112001\.mp3$/);
  assert.match(clips[2]?.url ?? "", /112002\.mp3$/);
});

test("the basmala clip comes from the same set as the rest of the passage", () => {
  const clips = passageClips("mujawwad", 2, [{ ayah: 1 }], true);
  assert.match(clips[0]?.url ?? "", /Abdul_Basit_Mujawwad_128kbps\/001001\.mp3$/);
  assert.match(clips[1]?.url ?? "", /Abdul_Basit_Mujawwad_128kbps\/002001\.mp3$/);
});

test("al-Fatiha needs no extra clip, since its first ayah is the basmala", () => {
  const clips = passageClips("murattal", 1, [{ ayah: 1 }, { ayah: 2 }]);
  assert.deepEqual(
    clips.map((c) => c.ayah),
    [1, 2],
  );
  assert.match(clips[0]?.url ?? "", /001001\.mp3$/);
});

test("jumping lands on the first clip of a unit, basmala included", () => {
  const clips = passageClips("murattal", 2, [{ ayah: 1 }, { ayah: 2 }], true);
  assert.equal(firstClipOf(clips, null), 0);
  assert.equal(firstClipOf(clips, 1), 1);
  assert.equal(firstClipOf(clips, 2), 2);
  assert.equal(firstClipOf(clips, 99), 0);
  assert.equal(firstClipOf([], 1), 0);
});

test("volume is clamped into 0..1 and bad input falls back", () => {
  assert.equal(clampVolume(-1), 0);
  assert.equal(clampVolume(5), 1);
  assert.equal(clampVolume(0.35), 0.35);
  assert.equal(clampVolume("x"), DEFAULT_VOLUME);
  assert.equal(clampVolume(Number.NaN), DEFAULT_VOLUME);
  assert.equal(clampVolume(undefined), DEFAULT_VOLUME);
});
