import { type ChangeEvent, useEffect, useId, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { BUTTON } from "~/ui/styles.ts";
import { deviceLanguages, useProfile } from "./ProfileProvider.tsx";
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
  const { profile, replace } = useProfile();
  const [pending, setPending] = useState<Profile | null>(null);
  const [failure, setFailure] = useState<ImportFailure | null>(null);
  const [status, setStatus] = useState<"downloaded" | "restored" | null>(null);
  const [notSaved, setNotSaved] = useState(false);
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
    setNotSaved(false);
    flushSync(() => setStatus(null));
    setStatus("downloaded");
  };

  const choose = async (event: ChangeEvent<HTMLInputElement>) => {
    const field = event.currentTarget;
    const chosen = field.files?.[0];
    field.value = "";
    setPending(null);
    setFailure(null);
    setNotSaved(false);
    setStatus(null);
    if (chosen === undefined) {
      return;
    }
    const result = importProfile(await readText(chosen), deviceLanguages());
    if (result.ok) {
      setPending(result.profile);
    } else {
      setFailure(result.reason);
    }
  };

  const answer = (restore: boolean) => {
    restoreFocus.current = true;
    if (restore && pending !== null) {
      const saved = replace(pending);
      setNotSaved(saved !== null);
      setStatus(saved === null ? "restored" : null);
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
      <div>
        <input
          id={inputId}
          ref={input}
          type="file"
          accept="application/json,.json"
          onChange={choose}
          aria-invalid={failure !== null}
          aria-describedby={failure === null ? undefined : alertId}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className={`${BUTTON} inline-flex items-center peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus)]`}
        >
          {t("backup.choose")}
        </label>
      </div>
      {failure !== null && (
        <p id={alertId} role="alert" className="text-sm font-medium text-danger">
          {t(FAILURE_MESSAGES[failure])}
        </p>
      )}
      {notSaved && (
        <p role="alert" className="text-sm font-medium text-danger">
          {t("backup.notSaved")}
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
