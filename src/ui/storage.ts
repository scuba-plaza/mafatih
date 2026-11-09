import type { Tier } from "~/engine/normalize.ts";
import { beginProgress, type Progress } from "~/engine/progression.ts";

export type TierOverride = "auto" | Tier;

export interface Settings {
  tierOverride: TierOverride;
  fingerColors: boolean;
}

export interface SurahProgress {
  ayah: number;
  done: boolean;
  star: boolean;
  bestAccuracy: number;
}

export interface Profile {
  version: 2;
  progress: Progress;
  settings: Settings;
  recitation: Record<string, SurahProgress>;
}

const KEY = "mafatih.profile.v2";

export function emptyProfile(): Profile {
  return {
    version: 2,
    progress: beginProgress(),
    settings: { tierOverride: "auto", fingerColors: true },
    recitation: {},
  };
}

export function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) {
      return emptyProfile();
    }
    const parsed = JSON.parse(raw) as Profile;
    if (parsed.version !== 2 || typeof parsed.progress !== "object") {
      return emptyProfile();
    }
    return parsed;
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(profile: Profile): void {
  localStorage.setItem(KEY, JSON.stringify(profile));
}

export function exportProfile(profile: Profile): string {
  return JSON.stringify(profile, null, 2);
}

export function parseProfile(raw: string): Profile | null {
  try {
    const parsed = JSON.parse(raw) as Profile;
    if (parsed.version !== 2 || typeof parsed.progress !== "object") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
