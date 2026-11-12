import { expect, test } from "vitest";
import { type KeyValueStore, openProfile, type Profile, STORAGE_KEY, UNREADABLE_KEY } from "./profile.ts";

const ENGLISH = ["en-US"];
const ARABIC = ["ar-EG", "en"];
const OTHER_DEFAULTS = {
  font: "noto-naskh",
  fontSize: 40,
  vocalization: "auto",
  requireBackspace: true,
  showKeyboard: true,
  fingerGuide: true,
  customText: "",
} as const;
const NO_PROGRESS = {
  ladder: { unlocked: 10 },
  stats: { practice: {}, recitation: {}, custom: {} },
  history: [],
  recitation: { position: null, surahs: {} },
} as const;
const ENGLISH_DEFAULTS: Profile = { schema: 2, settings: { language: "en", ...OTHER_DEFAULTS }, ...NO_PROGRESS };
const ARABIC_PROFILE: Profile = { schema: 2, settings: { language: "ar", ...OTHER_DEFAULTS }, ...NO_PROGRESS };

interface MemoryStore extends KeyValueStore {
  readonly data: Map<string, string>;
  readonly read: string[];
}

function memoryStore(initial: Record<string, string> = {}): MemoryStore {
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

function holding(stored: string): MemoryStore {
  return memoryStore({ [STORAGE_KEY]: stored });
}

function failing(thrown: unknown): () => never {
  return () => {
    throw thrown;
  };
}

test("the profile and the copy of unreadable data are kept under versioned keys", () => {
  expect(STORAGE_KEY).toBe("mafatih:profile:2");
  expect(UNREADABLE_KEY).toBe("mafatih:profile:2:unreadable");
});

test("a first visit starts with default settings in the visitor's language", () => {
  const opened = openProfile(memoryStore(), ENGLISH);
  expect(opened.profile).toEqual(ENGLISH_DEFAULTS);
  expect(opened.notice).toBeNull();
  expect(openProfile(memoryStore(), ARABIC).profile.settings.language).toBe("ar");
});

test("the visitor's languages may be missing or nonsense: English is the fallback", () => {
  for (const languages of [[], ["", "zz", "-"], ["fr-FR"]]) {
    expect(openProfile(memoryStore(), languages).profile).toEqual(ENGLISH_DEFAULTS);
  }
});

test("a saved profile is read back as it was, whatever the browser's language is now", () => {
  const store = memoryStore();
  expect(openProfile(store, ENGLISH).save(ARABIC_PROFILE)).toBeNull();
  expect(JSON.parse(store.data.get("mafatih:profile:2") ?? "")).toEqual({
    schema: 2,
    settings: {
      language: "ar",
      font: "noto-naskh",
      fontSize: 40,
      vocalization: "auto",
      requireBackspace: true,
      showKeyboard: true,
      fingerGuide: true,
      customText: "",
    },
    ladder: { unlocked: 10 },
    stats: { practice: {}, recitation: {}, custom: {} },
    history: [],
    recitation: { position: null, surahs: {} },
  });
  const reopened = openProfile(store, ENGLISH);
  expect(reopened.profile).toEqual(ARABIC_PROFILE);
  expect(reopened.notice).toBeNull();
});

test("the schema number is compared as a number", () => {
  expect(openProfile(holding('{"schema":2.0,"settings":{"language":"ar"}}'), ENGLISH).profile).toEqual(ARABIC_PROFILE);
});

test("saved data that cannot be understood is replaced by defaults, and the visitor is told", () => {
  const unreadable = ["{not json", "5", "null", "[]", '"text"', "{}", '{"schema":1,"settings":{"language":"ar"}}'];
  for (const stored of [...unreadable, '{"schema":"2"}', '{"schema":[2]}', '{"schema":true}', '{"schema":"3"}']) {
    const opened = openProfile(holding(stored), ENGLISH);
    expect(opened.profile, stored).toEqual(ENGLISH_DEFAULTS);
    expect(opened.notice, stored).toBe("reset");
  }
});

test("unreadable data is copied aside before anything can overwrite it", () => {
  const store = holding("{not json");
  const opened = openProfile(store, ENGLISH);
  expect(store.data.get("mafatih:profile:2:unreadable")).toBe("{not json");
  expect(opened.save(ARABIC_PROFILE)).toBeNull();
  expect(store.data.get("mafatih:profile:2:unreadable")).toBe("{not json");
  expect(openProfile(store, ENGLISH).profile).toEqual(ARABIC_PROFILE);
});

test("a copy that cannot be written does not stop the app from starting fresh", () => {
  const store: KeyValueStore = {
    getItem: () => "{not json",
    setItem: failing(new DOMException("full", "QuotaExceededError")),
  };
  const opened = openProfile(store, ENGLISH);
  expect(opened.profile).toEqual(ENGLISH_DEFAULTS);
  expect(opened.notice).toBe("reset");
});

test("progress saved by a newer version is left alone: the app runs on defaults and never writes over it", () => {
  const newer = '{"schema":3,"settings":{"language":"ar"},"future":true}';
  const store = holding(newer);
  const opened = openProfile(store, ENGLISH);
  expect(opened.profile).toEqual(ENGLISH_DEFAULTS);
  expect(opened.notice).toBe("newer");
  expect(opened.save(ARABIC_PROFILE)).toBe("newer");
  expect([...store.data]).toEqual([["mafatih:profile:2", newer]]);
});

test("a setting with an invalid value falls back to its default without discarding the rest", () => {
  const opened = openProfile(holding('{"schema":2,"settings":{"language":"fr"}}'), ARABIC);
  expect(opened.profile).toEqual(ARABIC_PROFILE);
  expect(opened.notice).toBeNull();
  expect(openProfile(holding('{"schema":2,"settings":"nope"}'), ENGLISH).profile).toEqual(ENGLISH_DEFAULTS);
  expect(openProfile(holding('{"schema":2}'), ENGLISH).profile).toEqual(ENGLISH_DEFAULTS);
});

test("unknown and dangerous keys in saved data are never copied into the profile", () => {
  const stored =
    '{"schema":2,"extra":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}},' +
    '"settings":{"language":"ar","__proto__":{"language":"en"},"constructor":1,"prototype":2,"x":1}}';
  const { profile } = openProfile(holding(stored), ENGLISH);
  expect(profile).toEqual(ARABIC_PROFILE);
  expect(Object.keys(profile)).toEqual(["schema", "settings", "ladder", "stats", "history", "recitation"]);
  expect(Object.keys(profile.settings).sort()).toEqual(
    [
      "customText",
      "fingerGuide",
      "font",
      "fontSize",
      "language",
      "requireBackspace",
      "showKeyboard",
      "vocalization",
    ].sort(),
  );
  expect(Object.hasOwn(Object.prototype, "polluted")).toBe(false);
});

test("the old version's data is never read", () => {
  const store = memoryStore({ "mafatih.profile": '{"settings":{"language":"ar"}}' });
  expect(openProfile(store, ENGLISH).profile.settings.language).toBe("en");
  expect(store.read).toEqual(["mafatih:profile:2"]);
  expect(store.data.get("mafatih.profile")).toBe('{"settings":{"language":"ar"}}');
});

test("when the browser refuses access to storage the app runs on defaults and says nothing can be saved", () => {
  const refused = failing(new DOMException("denied", "SecurityError"));
  const stores = [
    { getItem: refused, setItem: refused },
    { getItem: failing("not an error object"), setItem: refused },
    null,
  ];
  for (const store of stores) {
    const opened = openProfile(store, ARABIC);
    expect(opened.profile).toEqual(ARABIC_PROFILE);
    expect(opened.notice).toBe("unavailable");
    expect(opened.save(ENGLISH_DEFAULTS)).toBe("unavailable");
  }
});

test("a store that hands back something other than text is treated as unreadable", () => {
  for (const value of [5, {}, undefined]) {
    const store = { getItem: () => value, setItem: () => undefined } as unknown as KeyValueStore;
    expect(openProfile(store, ENGLISH).profile, String(value)).toEqual(ENGLISH_DEFAULTS);
  }
});

test("when saving fails the visitor is told, and nothing is thrown", () => {
  const store: KeyValueStore = {
    getItem: () => null,
    setItem: failing(new DOMException("full", "QuotaExceededError")),
  };
  expect(openProfile(store, ENGLISH).save(ARABIC_PROFILE)).toBe("unavailable");
});

test("every setting and all progress survive being saved and opened again", () => {
  const store = memoryStore();
  const changed: Profile = {
    schema: 2,
    settings: {
      language: "ar",
      font: "amiri",
      fontSize: 56,
      vocalization: "full",
      requireBackspace: false,
      showKeyboard: false,
      fingerGuide: false,
      customText: "بسم الله",
    },
    ladder: { unlocked: 12 },
    stats: {
      practice: { ش: { attempts: 9, hits: 8, timed: 8, meanMs: 512.5, recentAccuracy: 0.9 } },
      recitation: { لا: { attempts: 1, hits: 1, timed: 0, meanMs: 0, recentAccuracy: 1 } },
      custom: {},
    },
    history: [{ at: 1_700_000_000_000, mode: "recitation", chars: 120, ms: 65_000, accuracy: 0.97 }],
    recitation: {
      position: { surah: 36, ayah: 13 },
      surahs: { 1: { typed: [], completions: 2 }, 36: { typed: [[1, 12]], completions: 0 } },
    },
  };
  openProfile(store, ENGLISH).save(changed);
  expect(openProfile(store, ENGLISH).profile).toEqual(changed);
});

test("broken progress falls back on its own: the settings and the rest of the progress are kept", () => {
  const stat = { attempts: 2, hits: 2, timed: 2, meanMs: 400, recentAccuracy: 1 };
  const lesson = { at: 5, mode: "custom", chars: 10, ms: 4000, accuracy: 1 };
  const stored = JSON.stringify({
    schema: 2,
    settings: { language: "ar" },
    ladder: { unlocked: "many" },
    stats: { practice: { ب: stat, ت: "broken" }, recitation: 5, extra: { ب: stat } },
    history: [lesson, { ...lesson, mode: "quiz" }],
    recitation: { position: { surah: 1, ayah: 99 }, surahs: { 1: { typed: [[2, 3]], completions: "many" } } },
  });
  const { profile, notice } = openProfile(holding(stored), ENGLISH);
  expect(notice).toBeNull();
  expect(profile).toEqual({
    ...ARABIC_PROFILE,
    stats: { practice: { ب: stat }, recitation: {}, custom: {} },
    history: [lesson],
    recitation: { position: null, surahs: { 1: { typed: [[2, 3]], completions: 0 } } },
  });
  expect(
    openProfile(holding('{"schema":2,"ladder":{"unlocked":99},"stats":[],"history":{}}'), ENGLISH).profile,
  ).toEqual({
    ...ENGLISH_DEFAULTS,
    ladder: { unlocked: 44 },
  });
});
