import { useCallback, useEffect, useMemo, useState } from "react";
import Modal, { DoneButton, FIELD, NAME, NOTE } from "~/components/Modal.tsx";
import { DEFAULT_CUSTOM_TEXT, inspectCustomText, MAX_CUSTOM_CHARS } from "~/engine/lessons/custom.ts";
import type { Settings } from "~/storage/profile.ts";

export interface CustomTextModalProps {
  open: boolean;
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onBack: () => void;
  onClose: () => void;
}

function summarize(lines: number, length: number): string {
  if (length === 0) {
    return "Nothing typeable yet — a short sample is used until you add some Arabic.";
  }
  return `${length} characters · ${lines === 1 ? "1 line" : `${lines} lines`}`;
}

export default function CustomTextModal({ open, settings, onChange, onBack, onClose }: CustomTextModalProps) {
  const [draft, setDraft] = useState(settings.customText);
  const report = useMemo(() => inspectCustomText(draft), [draft]);

  useEffect(() => {
    if (open) {
      setDraft(settings.customText);
    }
  }, [open, settings.customText]);

  const commit = useCallback(() => {
    if (draft !== settings.customText) {
      onChange({ customText: draft });
    }
  }, [draft, settings.customText, onChange]);

  const leave = (go: () => void) => () => {
    commit();
    go();
  };

  return (
    <Modal
      open={open}
      cy="custom-text"
      title="Custom text"
      onBack={leave(onBack)}
      onClose={leave(onClose)}
      footer={
        <>
          <button
            type="button"
            data-cy="custom-text-sample"
            onClick={() => setDraft(DEFAULT_CUSTOM_TEXT)}
            className="text-xs text-stone-400 hover:text-stone-900 dark:hover:text-stone-100"
          >
            Use the sample
          </button>
          <DoneButton cy="custom-text-done" onClick={leave(onClose)} />
        </>
      }
    >
      <div className="flex flex-col gap-2 py-3">
        <span className={NAME}>Type or paste Arabic</span>
        <textarea
          data-cy="setting-custom-text"
          lang="ar"
          dir="rtl"
          rows={5}
          spellCheck={false}
          maxLength={MAX_CUSTOM_CHARS}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className={`${FIELD} w-full resize-y font-arabic text-xl leading-[1.9]`}
        />
      </div>

      <p
        className={NOTE}
        data-cy="custom-text-report"
        data-length={report.length}
        data-lines={report.lines.length}
        data-dropped={report.dropped.length}
      >
        {summarize(report.lines.length, report.length)}
        {report.dropped.length === 0 ? "" : ` · dropped ${report.dropped.join(" ")}`}
      </p>

      <p className={NOTE}>
        Every line break starts a new line in the lesson, and anything your Arabic keyboard cannot produce is removed.
        Custom lessons do not change your progress or statistics.
      </p>
    </Modal>
  );
}
