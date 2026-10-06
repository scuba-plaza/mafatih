import { useEffect } from "react";
import { saveProfile } from "~/storage/profile.ts";
import { decodeProfile, OVERWRITE_WARNING } from "~/storage/transfer.ts";

const IMPORT_PATTERN = /^#\/?import\/(.+)$/;

export function useImportLink(): void {
  useEffect(() => {
    const match = IMPORT_PATTERN.exec(window.location.hash);
    if (match === null) {
      return;
    }
    window.history.replaceState(window.history.state, "", "#/");
    const profile = decodeProfile(match[1] ?? "");
    if (profile === null) {
      window.alert("This transfer link could not be read. It may be corrupted or incomplete.");
      return;
    }
    if (!window.confirm(OVERWRITE_WARNING)) {
      return;
    }
    saveProfile(profile);
    window.location.reload();
  }, []);
}
