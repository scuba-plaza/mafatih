import type { Recitation } from "../../src/engine/recitation/recitation.ts";
import type { KeyStat, KeyStats } from "../../src/engine/stats/keystats.ts";
import type { Progress } from "../../src/engine/stats/unlock.ts";
import { defaultProfile, type Profile, type Settings, STORAGE_KEY } from "../../src/storage/profile.ts";

export interface ProfileSeed {
  settings?: Partial<Settings>;
  progress?: Partial<Progress>;
  stats?: KeyStats;
  surah?: number;
  ayah?: number;
  recitation?: Partial<Recitation>;
}

export function buildProfile(seed: ProfileSeed = {}): Profile {
  const base = defaultProfile();
  return {
    ...base,
    progress: { ...base.progress, ...seed.progress },
    settings: { ...base.settings, ...seed.settings },
    stats: seed.stats ?? base.stats,
    recitation: {
      ...base.recitation,
      ...seed.recitation,
      position: {
        ...base.recitation.position,
        ...seed.recitation?.position,
        ...(seed.surah === undefined ? {} : { surah: seed.surah }),
        ...(seed.ayah === undefined ? {} : { ayah: seed.ayah }),
      },
    },
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
