import { type FormEvent, type KeyboardEvent, type ReactNode, useId, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { Rail } from "~/ui/Rail.tsx";
import { BUTTON } from "~/ui/styles.ts";
import type { Position } from "./progress.ts";
import type { SurahMeta } from "./quran.ts";

const TEXT_BUTTON = "flex min-h-11 items-center justify-center rounded-xl px-3 text-sm text-muted";

export interface PassageFooterProps {
  readonly meta: SurahMeta;
  readonly from: number;
  readonly typed: number;
  readonly previous: Position;
  readonly next: Position;
  readonly onGo: (position: Position) => void;
  readonly audio: ReactNode;
}

export function PassageFooter({ meta, from, typed, previous, next, onGo, audio }: PassageFooterProps) {
  const { t } = useI18n();
  const formId = useId();
  const fieldId = useId();
  const errorId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(from));
  const [shownFrom, setShownFrom] = useState(from);
  const [invalid, setInvalid] = useState(false);

  if (shownFrom !== from) {
    setShownFrom(from);
    setDraft(String(from));
    setInvalid(false);
  }

  const keys = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "PageDown") {
      event.preventDefault();
      onGo(next);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      onGo(previous);
    } else if (event.key === "Escape" && open) {
      event.stopPropagation();
      setOpen(false);
      opener.current?.focus();
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = draft.trim() === "" ? Number.NaN : Number(draft);
    if (!Number.isFinite(value)) {
      setInvalid(true);
      return;
    }
    const ayah = Math.min(Math.max(1, Math.trunc(value)), meta.ayat);
    setInvalid(false);
    setDraft(String(ayah));
    onGo({ surah: meta.n, ayah });
  };

  return (
    <fieldset onKeyDown={keys} className="mt-auto flex min-w-0 flex-col gap-3 pt-6">
      <legend className="sr-only">{t("bar.label")}</legend>
      <Rail value={typed / meta.ayat} />
      <div className="grid grid-cols-1 gap-y-1 md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-x-4">
        <p className="sr-only text-xs text-muted md:not-sr-only">{t("map.typed", { typed, total: meta.ayat })}</p>
        <div className="justify-self-center">{audio}</div>
        <div data-footer-extras="" className="flex items-center gap-1 md:justify-end">
          <button
            ref={opener}
            type="button"
            aria-expanded={open}
            aria-controls={formId}
            onClick={() => setOpen(!open)}
            className={`${TEXT_BUTTON} font-mono aria-expanded:text-accent`}
          >
            <span aria-hidden="true">#</span>
            <span className="sr-only">{t("bar.goTo")}</span>
          </button>
          <button type="button" onClick={() => onGo(previous)} className={`${TEXT_BUTTON} ms-auto md:ms-0`}>
            {t("bar.previous")}
          </button>
          <button type="button" onClick={() => onGo(next)} className={TEXT_BUTTON}>
            {t("recitation.next")}
          </button>
        </div>
      </div>
      <form
        id={formId}
        hidden={!open}
        onSubmit={submit}
        noValidate
        className="flex flex-wrap items-end justify-center gap-2"
      >
        <div className="flex min-w-0 flex-col">
          <label htmlFor={fieldId} className="text-sm text-muted">
            {t("bar.goTo")}
          </label>
          <input
            id={fieldId}
            name="ayah"
            type="number"
            inputMode="numeric"
            min={1}
            max={meta.ayat}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setInvalid(false);
            }}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={invalid ? errorId : undefined}
            className="h-11 w-28 rounded-xl border border-edge bg-transparent px-3 aria-invalid:border-danger"
          />
        </div>
        <button type="submit" className={BUTTON}>
          {t("bar.go")}
        </button>
        {invalid && (
          <p id={errorId} role="alert" className="w-full text-center text-sm font-medium text-danger">
            {t("bar.invalid", { count: meta.ayat })}
          </p>
        )}
      </form>
    </fieldset>
  );
}
