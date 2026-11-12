import { expect, test } from "vitest";
import { openProfile, type Profile } from "./profile.ts";
import { exportProfile, importProfile, MAX_IMPORT_BYTES } from "./transfer.ts";

const FRESH = openProfile(null, ["en"]).profile;
const FATHA = String.fromCodePoint(0x64e);
const NOW = new Date(2026, 10, 12, 15, 4, 5);

const USED: Profile = {
  ...FRESH,
  settings: {
    ...FRESH.settings,
    language: "ar",
    fontSize: 56,
    vocalization: "harakat",
    reciter: "mujawwad",
    volume: 0.3,
  },
  ladder: { unlocked: 23 },
  stats: {
    practice: { ش: { attempts: 9, hits: 8, timed: 8, meanMs: 512.5, recentAccuracy: 0.9 } },
    recitation: { [FATHA]: { attempts: 3, hits: 3, timed: 2, meanMs: 640, recentAccuracy: 1 } },
    custom: {},
  },
  history: [{ at: 1_700_000_000_000, mode: "recitation", chars: 120, ms: 65_000, accuracy: 0.97 }],
  recitation: { position: { surah: 36, ayah: 13 }, surahs: { 36: { typed: [[1, 12]], completions: 0 } } },
};

function backup(profile: unknown, over: Record<string, unknown> = {}): string {
  return JSON.stringify({ app: "mafatih", schema: 2, exportedAt: NOW.toISOString(), profile, ...over });
}

test("a backup is a file named by the day, holding the app, the schema, the time and the whole profile", () => {
  const { filename, json } = exportProfile(USED, NOW);
  expect(filename).toBe("mafatih-backup-2026-11-12.json");
  const envelope = JSON.parse(json);
  expect(envelope).toMatchObject({ app: "mafatih", schema: 2 });
  expect(new Date(envelope.exportedAt).getTime()).toBe(NOW.getTime());
  expect(envelope.profile).toEqual(USED);
});

test("a backup restores exactly the profile it was made from", () => {
  const result = importProfile(exportProfile(USED, NOW).json, ["en"]);
  expect(result).toEqual({ ok: true, profile: USED });
});

test("a backup of a fresh profile restores a fresh profile", () => {
  expect(importProfile(exportProfile(FRESH, NOW).json, ["en"])).toEqual({ ok: true, profile: FRESH });
});

test("text over two megabytes of bytes is refused before it is read, however few characters it has", () => {
  expect(MAX_IMPORT_BYTES).toBe(2_000_000);
  expect(importProfile("x".repeat(5_000_000), ["en"])).toEqual({ ok: false, reason: "too-large" });
  const arabic = "ب".repeat(1_000_001);
  expect(arabic.length).toBeLessThan(MAX_IMPORT_BYTES);
  expect(importProfile(arabic, ["en"])).toEqual({ ok: false, reason: "too-large" });
});

test("text that is not JSON is not a backup", () => {
  for (const text of ["", "{not json", "<html></html>", "undefined"]) {
    expect(importProfile(text, ["en"]), text).toEqual({ ok: false, reason: "not-json" });
  }
});

test("JSON that is not a backup envelope is not a backup", () => {
  const texts = [
    "5",
    "null",
    "[]",
    '"text"',
    "{}",
    '{"schema":2}',
    '{"schema":2,"settings":{}}',
    '{"app":"other","schema":2,"profile":{}}',
    '{"app":"other","schema":1,"profile":{}}',
    '{"schema":2,"profile":{}}',
    '{"schema":3,"settings":{}}',
    '{"app":"mafatih","schema":2}',
    '{"app":"mafatih","schema":2,"profile":[]}',
    '{"app":"mafatih","schema":2,"profile":"x"}',
    '{"app":"mafatih","schema":"2","profile":{}}',
  ];
  for (const text of texts) {
    expect(importProfile(text, ["en"]), text).toEqual({ ok: false, reason: "not-a-backup" });
  }
});

test("a backup of another schema, such as the old app's export, is a wrong version", () => {
  const texts = [
    '{"app":"mafatih","schema":1,"profile":{}}',
    '{"app":"mafatih","schema":3,"profile":{}}',
    '{"schema":1,"settings":{"language":"ar"}}',
    '{"app":"mafatih","schema":2.5,"profile":{}}',
  ];
  for (const text of texts) {
    expect(importProfile(text, ["en"]), text).toEqual({ ok: false, reason: "wrong-version" });
  }
});

test("a backup with missing or broken parts restores the rest and gives defaults for those", () => {
  const result = importProfile(
    backup({ settings: { language: "ar" }, ladder: { unlocked: "many" }, stats: 5, history: {} }),
    ["en"],
  );
  expect(result).toEqual({
    ok: true,
    profile: { ...FRESH, settings: { ...FRESH.settings, language: "ar" } },
  });
});

test("a backup without a language takes the language of the device that restores it", () => {
  const text = backup({ settings: {} });
  expect(importProfile(text, ["ar-EG", "en"])).toMatchObject({ ok: true, profile: { settings: { language: "ar" } } });
  expect(importProfile(text, ["en-GB"])).toMatchObject({ ok: true, profile: { settings: { language: "en" } } });
});

test("hostile content is neutralised: prototype keys, unknown keys, wrong types", () => {
  const text =
    '{"app":"mafatih","schema":2,"__proto__":{"polluted":true},"profile":{"__proto__":{"polluted":true},' +
    '"constructor":{"prototype":{"polluted":true}},"extra":1,"settings":{"language":"ar","__proto__":{"language":"en"},' +
    '"fontSize":"huge","customText":5,"reciter":"toString"},"ladder":{"unlocked":1e300},"recitation":{"position":{"surah":-1,"ayah":0}}}}';
  const result = importProfile(text, ["en"]);
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.profile.settings.language).toBe("ar");
    expect(result.profile.settings.fontSize).toBe(40);
    expect(result.profile.settings.customText).toBe("");
    expect(result.profile.settings.reciter).toBe("murattal");
    expect(result.profile.ladder).toEqual({ unlocked: 44 });
    expect(result.profile.recitation.position).toBeNull();
    expect(Object.keys(result.profile)).toEqual(["schema", "settings", "ladder", "stats", "history", "recitation"]);
  }
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
});

test("huge lists are cut: at most a hundred lessons and a few dozen keys, however many were written", () => {
  const history = Array.from({ length: 5000 }, (_, index) => ({
    at: index,
    mode: "practice",
    chars: 40,
    ms: 20_000,
    accuracy: 1,
  }));
  const junk = Object.fromEntries(
    Array.from({ length: 5000 }, (_, index) => [
      `k${index}`,
      { attempts: 1, hits: 1, timed: 1, meanMs: 300, recentAccuracy: 1 },
    ]),
  );
  const result = importProfile(
    backup({ history, stats: { practice: { ...junk, ب: USED.stats.practice.ش }, recitation: junk, custom: {} } }),
    ["en"],
  );
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.profile.history).toHaveLength(100);
    expect(result.profile.history[0]?.at).toBe(4900);
    expect(Object.keys(result.profile.stats.practice)).toEqual(["ب"]);
    expect(Object.keys(result.profile.stats.recitation)).toEqual([]);
  }
});

test("a backup that is only just small enough is read", () => {
  const text = backup({});
  expect(importProfile(text + " ".repeat(MAX_IMPORT_BYTES - text.length), ["en"]).ok).toBe(true);
  expect(importProfile(text + " ".repeat(MAX_IMPORT_BYTES - text.length + 1), ["en"])).toEqual({
    ok: false,
    reason: "too-large",
  });
});
