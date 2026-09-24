import type { KeyStat } from "../../src/engine/stats/keystats.ts";
import type { Progress } from "../../src/engine/stats/unlock.ts";
import { defaultProfile, type Profile, type Settings, STORAGE_KEY } from "../../src/storage/profile.ts";

export type StoredStat = Omit<KeyStat, "recentAccuracy"> & Partial<Pick<KeyStat, "recentAccuracy">>;

export type StoredStats = Readonly<Record<string, StoredStat>>;

export type StoredProfile = Omit<Profile, "stats"> & { stats: StoredStats };

export interface ProfileSeed {
  settings?: Partial<Settings>;
  progress?: Partial<Progress>;
  stats?: StoredStats;
}

export function buildProfile(seed: ProfileSeed = {}): StoredProfile {
  const base = defaultProfile();
  return {
    ...base,
    progress: { ...base.progress, ...seed.progress },
    settings: { ...base.settings, ...seed.settings },
    stats: seed.stats ?? base.stats,
  };
}

export function masteredStats(chars: readonly string[], samples = 40, meanMs = 150): Record<string, KeyStat> {
  const stats: Record<string, KeyStat> = {};
  for (const char of chars) {
    stats[char] = { char, samples, meanMs, hits: samples, misses: 0, recentAccuracy: 1 };
  }
  return stats;
}

export function visitWith(seed: ProfileSeed, query = "?seed=4242"): void {
  const profile = buildProfile(seed);
  cy.visit(query, {
    onBeforeLoad(win) {
      win.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    },
  });
}
