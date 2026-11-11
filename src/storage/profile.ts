import { defaultSettings, type Settings, sanitizeSettings } from "~/settings/settings.ts";
import { isRecord } from "./guards.ts";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface Profile {
  readonly schema: 2;
  readonly settings: Settings;
}

export type StorageNotice = "unavailable" | "reset" | null;

export interface LoadedProfile {
  readonly profile: Profile;
  readonly notice: StorageNotice;
}

export const STORAGE_KEY = "mafatih:profile:2";

const SCHEMA = 2;

function parse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function loadProfile(store: KeyValueStore | null, preferredLanguages: readonly string[]): LoadedProfile {
  const fresh: Profile = { schema: SCHEMA, settings: defaultSettings(preferredLanguages) };
  if (store === null) {
    return { profile: fresh, notice: "unavailable" };
  }
  let stored: string | null;
  try {
    stored = store.getItem(STORAGE_KEY);
  } catch {
    return { profile: fresh, notice: "unavailable" };
  }
  if (stored === null) {
    return { profile: fresh, notice: null };
  }
  const raw = parse(stored);
  if (!isRecord(raw) || raw.schema !== SCHEMA) {
    return { profile: fresh, notice: "reset" };
  }
  return { profile: { schema: SCHEMA, settings: sanitizeSettings(raw.settings, preferredLanguages) }, notice: null };
}

export function saveProfile(store: KeyValueStore | null, profile: Profile): StorageNotice {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    return "unavailable";
  }
  return store === null ? "unavailable" : null;
}
