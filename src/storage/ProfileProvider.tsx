import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  eraseProfile,
  type KeyValueStore,
  type OpenedProfile,
  openProfile,
  type Profile,
  STORAGE_KEY,
  type StorageNotice,
} from "./profile.ts";

export interface ProfileState {
  readonly profile: Profile;
  readonly notice: StorageNotice;
  readonly update: (change: (profile: Profile) => Profile) => Profile;
  readonly replace: (profile: Profile) => StorageNotice;
}

const ProfileContext = createContext<ProfileState | null>(null);

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function deviceLanguages(): readonly string[] {
  return navigator.languages ?? [navigator.language];
}

function open(): OpenedProfile {
  return openProfile(browserStore(), deviceLanguages());
}

export function eraseStoredProfile(): void {
  eraseProfile(browserStore());
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(open);
  const latest = useRef(opened);

  const adopt = useCallback((next: OpenedProfile) => {
    latest.current = next;
    setOpened(next);
  }, []);

  const replace = useCallback(
    (profile: Profile): StorageNotice => {
      const current = latest.current;
      const saved = current.save(profile);
      const kept = current.notice === "unavailable" ? null : current.notice;
      adopt({ ...current, profile, notice: saved ?? kept });
      return saved;
    },
    [adopt],
  );

  const update = useCallback(
    (change: (profile: Profile) => Profile): Profile => {
      const profile = change(latest.current.profile);
      replace(profile);
      return profile;
    },
    [replace],
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        adopt(open());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [adopt]);

  const value = useMemo(
    () => ({ profile: opened.profile, notice: opened.notice, update, replace }),
    [opened, update, replace],
  );
  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error("useProfile needs a ProfileProvider above it");
  }
  return value;
}
