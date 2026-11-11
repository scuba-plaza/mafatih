import { createContext, type ReactNode, useContext, useState } from "react";
import { type KeyValueStore, type OpenedProfile, openProfile } from "./profile.ts";

type ProfileState = Pick<OpenedProfile, "profile" | "notice">;

const ProfileContext = createContext<ProfileState | null>(null);

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [opened] = useState(() => openProfile(browserStore(), navigator.languages ?? [navigator.language]));
  return <ProfileContext value={opened}>{children}</ProfileContext>;
}

export function useProfile(): ProfileState {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error("useProfile needs a ProfileProvider above it");
  }
  return value;
}
