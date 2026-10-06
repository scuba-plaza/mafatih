import { useEffect, useRef, useState } from "react";
import Modal, { DoneButton, FIELD, NAME, NOTE } from "~/components/Modal.tsx";
import { PRIMARY_BUTTON } from "~/components/ui.ts";
import { type Profile, parseProfileOrNull, saveProfile } from "~/storage/profile.ts";
import { downloadProfile, OVERWRITE_WARNING, transferLink } from "~/storage/transfer.ts";

export interface TransferModalProps {
  open: boolean;
  profile: Profile;
  onBack: () => void;
  onClose: () => void;
}

export default function TransferModal({ open, profile, onBack, onClose }: TransferModalProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setLink(null);
      setCopied(false);
      setError(null);
    }
  }, [open]);

  const copyLink = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const importText = (text: string) => {
    const imported = parseProfileOrNull(text);
    if (imported === null) {
      setError("That doesn't look like a Mafatih progress export.");
      return;
    }
    setError(null);
    if (!window.confirm(OVERWRITE_WARNING)) {
      return;
    }
    saveProfile(imported);
    window.location.reload();
  };

  const importFile = async (file: File) => {
    importText(await file.text());
  };

  return (
    <Modal
      open={open}
      cy="transfer"
      title="Export & import"
      onBack={onBack}
      onClose={onClose}
      footer={<DoneButton cy="transfer-done" onClick={onClose} />}
    >
      <div className="flex flex-col gap-3 py-3">
        <span className={NAME}>Export</span>
        <p className={NOTE}>
          Save progress, statistics, recitation and settings as a file, or as a link you can open on another device.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-cy="export-file"
            onClick={() => downloadProfile(profile)}
            className={`${PRIMARY_BUTTON} py-1.5`}
          >
            Download file
          </button>
          <button
            type="button"
            data-cy="export-link"
            onClick={() => {
              setLink(transferLink(profile));
              setCopied(false);
            }}
            className={`${FIELD} hover:bg-stone-200 dark:hover:bg-stone-700`}
          >
            Create transfer link
          </button>
        </div>
        {link === null ? null : (
          <div className="flex flex-col gap-2">
            <input
              type="text"
              readOnly
              data-cy="transfer-link"
              value={link}
              onFocus={(event) => event.currentTarget.select()}
              className={`${FIELD} w-full font-mono text-xs`}
            />
            <button
              type="button"
              data-cy="copy-transfer-link"
              onClick={() => void copyLink(link)}
              className="self-start text-xs text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 py-3">
        <span className={NAME}>Import</span>
        <p className={NOTE}>Load a file exported from Mafatih. This overwrites everything currently saved here.</p>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          data-cy="import-file-input"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file !== undefined) {
              void importFile(file);
            }
          }}
        />
        <button
          type="button"
          data-cy="import-file"
          onClick={() => fileInput.current?.click()}
          className={`${FIELD} w-fit hover:bg-stone-200 dark:hover:bg-stone-700`}
        >
          Choose file…
        </button>
        {error === null ? null : (
          <p data-cy="import-error" className="text-xs text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
