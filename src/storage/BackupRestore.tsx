import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { useProfile } from "./ProfileProvider.tsx";
import type { Profile } from "./profile.ts";
import { type Backup, exportProfile, type ImportFailure, importProfile, MAX_IMPORT_BYTES } from "./transfer.ts";

const REVOKE_DELAY_MS = 10_000;

const FAILURE_MESSAGES: Readonly<Record<ImportFailure, MessageKey>> = {
  "too-large": "backup.tooLarge",
  "not-json": "backup.notJson",
  "not-a-backup": "backup.notABackup",
  "wrong-version": "backup.wrongVersion",
};

function saveFile({ filename, json }: Backup): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

async function readText(file: File): Promise<string> {
  try {
    return await file.slice(0, MAX_IMPORT_BYTES + 1).text();
  } catch {
    return "";
  }
}

export function BackupRestore() {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const [pending, setPending] = useState<Profile | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [status, setStatus] = useState<"downloaded" | "restored" | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const restoreFocus = useRef(false);
  const inputId = useId();
  const alertId = useId();

  useEffect(() => {
    if (pending === null && restoreFocus.current) {
      restoreFocus.current = false;
      input.current?.focus();
    }
  }, [pending]);

  const download = () => {
    saveFile(exportProfile(profile, new Date()));
    setFailure(null);
    setStatus("downloaded");
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.currentTarget;
    const chosen = field.files?.[0];
    field.value = "";
    setPending(null);
    setFailure(null);
    setStatus(null);
    if (chosen === undefined) {
      return;
    }
    const result = importProfile(await readText(chosen));
    if (result.ok) {
      setPending(result.profile);
    } else {
      setFailure(result.reason);
    }
  };

  const answer = (replace: boolean) => {
    restoreFocus.current = true;
    if (replace && pending !== null) {
      update(() => pending);
      setStatus("restored");
    }
    setPending(null);
  };

  return (
    <fieldset className="flex flex-col items-start gap-3">
      <legend className="mb-1 font-semibold">{t("backup.title")}</legend>
      <p className="text-sm text-muted">{t("backup.hint")}</p>
      <button type="button" onClick={download} className={BUTTON}>
        {t("backup.download")}
      </button>
      <div className="flex w-full flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium">
          {t("backup.choose")}
        </label>
        <input
          id={inputId}
          ref={input}
          type="file"
          accept="application/json,.json"
          onChange={choose}
          aria-invalid={failure !== null}
          aria-describedby={failure === null ? undefined : alertId}
          className="w-full min-w-0 text-sm file:me-3 file:min-h-11 file:rounded-md file:border file:border-line file:bg-surface file:px-4 file:font-medium"
        />
      </div>
      {failure !== null && (
        <p id={alertId} role="alert" className="text-sm font-medium text-danger">
          {t(FAILURE_MESSAGES[failure])}
        </p>
      )}
      {pending !== null && (
        <ConfirmChoice
          question={t("backup.question")}
          warning={t("backup.warning")}
          keepLabel={t("settings.keepProgress")}
          confirmLabel={t("backup.replace")}
          onAnswer={answer}
        />
      )}
      <p role="status" className="min-h-5 text-sm text-muted">
        {status === null ? "" : t(status === "downloaded" ? "backup.downloaded" : "backup.restored")}
      </p>
    </fieldset>
  );
}
