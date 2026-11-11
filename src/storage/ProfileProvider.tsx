import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
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
  readonly update: (change: (profile: Profile) => Profile) => void;
}

const ProfileContext = createContext<ProfileState | null>(null);

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function open(): OpenedProfile {
  return openProfile(browserStore(), navigator.languages ?? [navigator.language]);
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(open);
  const latest = useRef(opened);

  const adopt = useCallback((next: OpenedProfile) => {
    latest.current = next;
    setOpened(next);
  }, []);

  const update = useCallback(
    (change: (profile: Profile) => Profile) => {
      const current = latest.current;
      const profile = change(current.profile);
      adopt({ ...current, profile, notice: current.save(profile) ?? current.notice });
    },
    [adopt],
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

  const value = useMemo(() => ({ profile: opened.profile, notice: opened.notice, update }), [opened, update]);
  return <ProfileContext value={value}>{children}</ProfileContext>;
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error("useProfile needs a ProfileProvider above it");
  }
  return value;
}
