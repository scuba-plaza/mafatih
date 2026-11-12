import { type FormEvent, type KeyboardEvent, useId } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { BUTTON } from "~/ui/styles.ts";
import type { Position } from "./progress.ts";
import type { SurahMeta } from "./quran.ts";

export interface PassageBarProps {
  readonly meta: SurahMeta;
  readonly from: number;
  readonly typed: number;
  readonly previous: Position;
  readonly next: Position;
  readonly onGo: (position: Position) => void;
}

export function PassageBar({ meta, from, typed, previous, next, onGo }: PassageBarProps) {
  const { t } = useI18n();
  const textId = useId();
  const fieldId = useId();

  const pageKeys = (event: KeyboardEvent<HTMLFieldSetElement>) => {
    if (event.key === "PageDown") {
      event.preventDefault();
      onGo(next);
    } else if (event.key === "PageUp") {
      event.preventDefault();
      onGo(previous);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const raw = new FormData(event.currentTarget).get("ayah");
    const value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
    if (Number.isFinite(value)) {
      onGo({ surah: meta.n, ayah: Math.min(Math.max(1, Math.trunc(value)), meta.ayat) });
    }
  };

  return (
    <fieldset onKeyDown={pageKeys} className="flex min-w-0 flex-col gap-3 rounded-md border border-line bg-surface p-3">
      <legend className="sr-only">{t("bar.label")}</legend>
      <div className="flex flex-col gap-1">
        <span id={textId} className="text-sm">
          {t("map.typed", { typed, total: meta.ayat })}
        </span>
        <progress aria-labelledby={textId} value={typed} max={meta.ayat} className="h-2 w-full" />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <button type="button" onClick={() => onGo(previous)} className={BUTTON}>
          {t("bar.previous")}
        </button>
        <button type="button" onClick={() => onGo(next)} className={BUTTON}>
          {t("recitation.next")}
        </button>
        <form onSubmit={submit} noValidate className="flex w-full items-end gap-2 sm:ms-auto sm:w-auto">
          <div className="flex min-w-0 flex-1 flex-col sm:flex-none">
            <label htmlFor={fieldId} className="text-sm text-muted">
              {t("bar.goTo")}
            </label>
            <input
              key={from}
              id={fieldId}
              name="ayah"
              type="number"
              inputMode="numeric"
              min={1}
              max={meta.ayat}
              defaultValue={from}
              className="h-11 w-full rounded-md border border-line bg-surface px-3 sm:w-24"
            />
          </div>
          <button type="submit" className={BUTTON}>
            {t("bar.go")}
          </button>
        </form>
      </div>
    </fieldset>
  );
}
