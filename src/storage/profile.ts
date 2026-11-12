import { isRecord } from "~/lib/guards.ts";
import { type LadderProgress, sanitizeProgress } from "~/practice/ladder.ts";
import { type Settings, sanitizeSettings } from "~/settings/settings.ts";
import { type KeyStats, sanitizeStats } from "~/stats/keystats.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export type Mode = "practice" | "recitation" | "custom";

export interface Profile {
  readonly schema: 2;
  readonly settings: Settings;
  readonly ladder: LadderProgress;
  readonly stats: Readonly<Record<Mode, KeyStats>>;
}

export type StorageNotice = "unavailable" | "reset" | "newer" | null;

export interface OpenedProfile {
  readonly profile: Profile;
  readonly notice: StorageNotice;
  readonly save: (profile: Profile) => StorageNotice;
}

export const STORAGE_KEY = "mafatih:profile:2";
export const UNREADABLE_KEY = "mafatih:profile:2:unreadable";

const SCHEMA = 2;

function sanitizeProfile(raw: Readonly<Record<string, unknown>>, preferredLanguages: readonly string[]): Profile {
  const stats = isRecord(raw.stats) ? raw.stats : {};
  return {
    schema: SCHEMA,
    settings: sanitizeSettings(raw.settings, preferredLanguages),
    ladder: sanitizeProgress(raw.ladder),
    stats: {
      practice: sanitizeStats(stats.practice),
      recitation: sanitizeStats(stats.recitation),
      custom: sanitizeStats(stats.custom),
    },
  };
}

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function write(store: KeyValueStore, key: string, text: string): StorageNotice {
  try {
    store.setItem(key, text);
  } catch {
    return "unavailable";
  }
  return null;
}

function read(store: KeyValueStore): { readonly stored: unknown } | undefined {
  try {
    return { stored: store.getItem(STORAGE_KEY) };
  } catch {
    return undefined;
  }
}

export function openProfile(store: KeyValueStore | null, preferredLanguages: readonly string[]): OpenedProfile {
  const fresh = sanitizeProfile({}, preferredLanguages);
  const found = store === null ? undefined : read(store);
  if (store === null || found === undefined) {
    return { profile: fresh, notice: "unavailable", save: () => "unavailable" };
  }
  const save = (profile: Profile): StorageNotice => write(store, STORAGE_KEY, JSON.stringify(profile));
  const { stored } = found;
  if (stored === null || stored === undefined) {
    return { profile: fresh, notice: null, save };
  }
  const raw = typeof stored === "string" ? parse(stored) : undefined;
  if (isRecord(raw) && typeof raw.schema === "number" && raw.schema > SCHEMA) {
    return { profile: fresh, notice: "newer", save: () => "newer" };
  }
  if (!isRecord(raw) || raw.schema !== SCHEMA) {
    if (typeof stored === "string") {
      write(store, UNREADABLE_KEY, stored);
    }
    return { profile: fresh, notice: "reset", save };
  }
  return { profile: sanitizeProfile(raw, preferredLanguages), notice: null, save };
}
