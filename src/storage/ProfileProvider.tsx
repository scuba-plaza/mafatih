import { createContext, type ReactNode, useContext, useState } from "react";
import { type KeyValueStore, type LoadedProfile, loadProfile } from "./profile.ts";

const ProfileContext = createContext<LoadedProfile | null>(null);

function browserStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(() => loadProfile(browserStore(), navigator.languages));
  return <ProfileContext value={loaded}>{children}</ProfileContext>;
}

export function useProfile(): LoadedProfile {
  const value = useContext(ProfileContext);
  if (value === null) {
    throw new Error("useProfile needs a ProfileProvider above it");
  }
  return value;
}
