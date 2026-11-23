import { BackupRestore } from "~/storage/BackupRestore.tsx";
import { ResetProgress } from "./ResetProgress.tsx";
import { UnlockLetters } from "./UnlockLetters.tsx";

export function DataSettings() {
  return (
    <>
      <BackupRestore />
      <UnlockLetters />
      <ResetProgress />
    </>
  );
}
