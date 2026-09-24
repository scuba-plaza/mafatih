import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_RECITER, DEFAULT_VOLUME } from "~/engine/audio/reciters.ts";
import { DEFAULT_FONT, DEFAULT_FONT_SIZE } from "~/engine/fonts.ts";
import { DEFAULT_CUSTOM_TEXT } from "~/engine/lessons/custom.ts";
import { DEFAULT_AYAT_PER_LESSON } from "~/engine/lessons/lesson.ts";
import { defaultProfile, defaultSettings, parseProfile, sanitizeSettings } from "~/storage/profile.ts";

test("a fresh profile types Noto Naskh at the default size", () => {
  const settings = defaultSettings();
  assert.equal(settings.font, DEFAULT_FONT);
  assert.equal(settings.fontSize, DEFAULT_FONT_SIZE);
});

test("every setting survives a round trip through storage", () => {
  const profile = defaultProfile();
  const stored = {
    ...profile,
    settings: {
      ...profile.settings,
      tierOverride: "full" as const,
      customText: "الحمد\nلله",
      font: "amiri" as const,
      fontSize: 64,
      surahOrder: "juz-amma" as const,
      ayatPerLesson: 10,
      showKeyboard: false,
      reciter: "mujawwad" as const,
      volume: 0.35,
      muted: true,
      autoAdvance: false,
      loop: true,
    },
  };
  assert.deepEqual(parseProfile(JSON.stringify(stored)).settings, stored.settings);
});

test("missing settings fall back rather than yielding undefined", () => {
  const stored = { ...defaultProfile(), settings: { font: "amiri" } };
  const settings = parseProfile(JSON.stringify(stored)).settings;
  assert.equal(settings.font, "amiri");
  assert.equal(settings.fontSize, DEFAULT_FONT_SIZE);
  assert.equal(settings.showKeyboard, true);
  assert.equal(settings.reciter, DEFAULT_RECITER);
  assert.equal(settings.volume, DEFAULT_VOLUME);
  assert.equal(settings.muted, false);
  assert.equal(settings.loop, false);
  assert.equal(settings.customText, DEFAULT_CUSTOM_TEXT);
});

test("a profile with only some settings keeps its progress and gains the defaults", () => {
  const before = {
    progress: { unlockedCount: 12, tier: "core", focus: null },
    stats: {},
    history: [{ at: 1, cpm: 90, accuracy: 0.97, errors: 2, chars: 180, tier: "core" }],
    settings: { font: "amiri", fontSize: 44, showKeyboard: false },
  };
  const profile = parseProfile(JSON.stringify(before));
  assert.equal(profile.progress.unlockedCount, 12);
  assert.equal(profile.history.length, 1);
  assert.equal(profile.settings.reciter, DEFAULT_RECITER);
  assert.equal(profile.settings.volume, DEFAULT_VOLUME);
  assert.equal(profile.settings.muted, false);
  assert.equal(profile.settings.autoAdvance, true);
  assert.equal(profile.settings.loop, false);
  assert.equal(profile.settings.customText, DEFAULT_CUSTOM_TEXT);
  assert.equal(profile.settings.ayatPerLesson, DEFAULT_AYAT_PER_LESSON);
});

test("hand-edited nonsense in storage cannot break a setting", () => {
  const settings = sanitizeSettings({
    tierOverride: "extreme",
    font: "comic sans",
    fontSize: "enormous",
    surahOrder: "alphabetical",
    ayatPerLesson: "all of them",
    showKeyboard: "yes",
    reciter: "abdulbasit",
    volume: "loud",
    muted: "kinda",
    autoAdvance: "sure",
    loop: "forever",
    customText: 42,
  });
  assert.deepEqual(settings, defaultSettings());
});

test("a stored custom text is kept verbatim but capped", () => {
  assert.equal(sanitizeSettings({ customText: "  الحمد\nلله  " }).customText, "  الحمد\nلله  ");
  assert.equal(sanitizeSettings({ customText: "ا".repeat(9000) }).customText.length, 5000);
});

test("a font size stored off-step snaps to an offered step", () => {
  assert.equal(sanitizeSettings({ fontSize: 45 }).fontSize, 44);
});

test("unreadable storage falls back to a fresh profile", () => {
  assert.deepEqual(parseProfile("{not json"), defaultProfile());
  assert.deepEqual(parseProfile("[1, 2]"), defaultProfile());
  assert.deepEqual(parseProfile(null), defaultProfile());
});

test("hand-edited progress and history are repaired", () => {
  const profile = parseProfile(
    JSON.stringify({
      progress: { unlockedCount: 900, tier: "legendary" },
      history: [
        { at: 1, cpm: 90, accuracy: 3, errors: 2, chars: 180, tier: "core" },
        { at: 2, cpm: "fast", accuracy: 0.9, errors: 0, chars: 10, tier: "none" },
        { at: 3, cpm: 50, tier: "unknown" },
        "garbage",
      ],
    }),
  );
  assert.equal(profile.progress.unlockedCount, 36);
  assert.equal(profile.progress.tier, "none");
  assert.deepEqual(profile.history, [
    { at: 1, cpm: 90, accuracy: 1, errors: 2, chars: 180, tier: "core" },
    { at: 2, cpm: 0, accuracy: 0.9, errors: 0, chars: 10, tier: "none" },
  ]);
  assert.equal(parseProfile(JSON.stringify({ progress: { unlockedCount: 2 } })).progress.unlockedCount, 6);
});

test("the recitation progress survives a round trip", () => {
  const stored = {
    ...defaultProfile(),
    recitation: {
      position: { surah: 2, ayah: 17 },
      surahs: {
        "112": {
          run: { typed: [], chars: 0, keystrokes: 0, errors: 0, elapsedMs: 0 },
          resume: 1,
          completions: 1,
          bestAccuracy: 0.97,
          bestCpm: 120,
          completedAt: 5,
        },
      },
    },
  };
  const profile = parseProfile(JSON.stringify(stored));
  assert.deepEqual(profile.recitation, stored.recitation);
});
