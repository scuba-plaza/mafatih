import { BackupRestore } from "~/storage/BackupRestore.tsx";
import { ResetProgress } from "./ResetProgress.tsx";

export function DataSettings() {
  return (
    <>
      <BackupRestore />
      <ResetProgress />
    </>
  );
}
