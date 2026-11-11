import { expect, test } from "vitest";
import { type KeyValueStore, loadProfile, STORAGE_KEY, saveProfile } from "./profile.ts";

const ENGLISH = ["en-US"];
const ARABIC = ["ar-EG", "en"];

function memoryStore(
  initial: Record<string, string> = {},
): KeyValueStore & { data: Map<string, string>; read: string[] } {
  const data = new Map(Object.entries(initial));
  const read: string[] = [];
  return {
    data,
    read,
    getItem: (key) => {
      read.push(key);
      return data.get(key) ?? null;
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}

function brokenStore(name: string): KeyValueStore {
  const fail = (): never => {
    throw new DOMException("denied", name);
  };
  return { getItem: fail, setItem: fail };
}

test("the profile is kept under its own versioned key", () => {
  expect(STORAGE_KEY).toBe("mafatih:profile:2");
});

test("a first visit starts with default settings in the visitor's language", () => {
  expect(loadProfile(memoryStore(), ENGLISH)).toEqual({
    profile: { schema: 2, settings: { language: "en" } },
    notice: null,
  });
  expect(loadProfile(memoryStore(), ARABIC).profile.settings.language).toBe("ar");
});

test("a saved profile is read back as it was, whatever the browser's language is now", () => {
  const store = memoryStore();
  expect(saveProfile(store, { schema: 2, settings: { language: "ar" } })).toBeNull();
  expect(JSON.parse(store.data.get("mafatih:profile:2") ?? "")).toEqual({ schema: 2, settings: { language: "ar" } });
  expect(loadProfile(store, ENGLISH)).toEqual({ profile: { schema: 2, settings: { language: "ar" } }, notice: null });
});

test("saved data that cannot be understood is replaced by defaults, and the visitor is told", () => {
  for (const stored of [
    "{not json",
    "5",
    "null",
    "[]",
    '"text"',
    "{}",
    '{"schema":1,"settings":{"language":"ar"}}',
    '{"schema":"2"}',
  ]) {
    const loaded = loadProfile(memoryStore({ [STORAGE_KEY]: stored }), ENGLISH);
    expect(loaded, stored).toEqual({ profile: { schema: 2, settings: { language: "en" } }, notice: "reset" });
  }
});

test("a setting with an invalid value falls back to its default without discarding the rest", () => {
  const stored = JSON.stringify({ schema: 2, settings: { language: "fr" } });
  expect(loadProfile(memoryStore({ [STORAGE_KEY]: stored }), ARABIC)).toEqual({
    profile: { schema: 2, settings: { language: "ar" } },
    notice: null,
  });
  const noSettings = JSON.stringify({ schema: 2, settings: "nope" });
  expect(loadProfile(memoryStore({ [STORAGE_KEY]: noSettings }), ENGLISH).profile.settings).toEqual({ language: "en" });
});

test("unknown and dangerous keys in saved data are never copied into the profile", () => {
  const stored =
    '{"schema":2,"extra":1,"__proto__":{"polluted":true},"settings":{"language":"ar","__proto__":{"language":"en"},"x":1}}';
  const { profile } = loadProfile(memoryStore({ [STORAGE_KEY]: stored }), ENGLISH);
  expect(profile).toEqual({ schema: 2, settings: { language: "ar" } });
  expect(Object.keys(profile)).toEqual(["schema", "settings"]);
  expect(Object.keys(profile.settings)).toEqual(["language"]);
  expect(({} as Record<string, unknown>).polluted).toBeUndefined();
});

test("the old version's data is never read", () => {
  const store = memoryStore({ "mafatih.profile": '{"settings":{"language":"ar"}}' });
  expect(loadProfile(store, ENGLISH).profile.settings.language).toBe("en");
  expect(store.read).toEqual(["mafatih:profile:2"]);
  expect(store.data.get("mafatih.profile")).toBe('{"settings":{"language":"ar"}}');
});

test("when the browser refuses access to storage the app runs on defaults and says nothing can be saved", () => {
  for (const store of [brokenStore("SecurityError"), null]) {
    expect(loadProfile(store, ARABIC)).toEqual({
      profile: { schema: 2, settings: { language: "ar" } },
      notice: "unavailable",
    });
  }
});

test("when saving fails the visitor is told, and nothing is thrown", () => {
  const profile = { schema: 2, settings: { language: "ar" } } as const;
  expect(saveProfile(brokenStore("QuotaExceededError"), profile)).toBe("unavailable");
  expect(saveProfile(null, profile)).toBe("unavailable");
});
