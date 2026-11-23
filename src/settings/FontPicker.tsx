import { useId } from "react";
import { FONTS, type FontId } from "./fonts.ts";

const FONT_SAMPLE = "الخط";

export interface FontPickerProps {
  readonly legend: string;
  readonly value: FontId;
  readonly onChange: (font: FontId) => void;
}

export function FontPicker({ legend, value, onChange }: FontPickerProps) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col gap-2">
      <legend className="mb-1 font-medium">{legend}</legend>
      <div className="grid grid-cols-3 gap-2">
        {FONTS.map((font) => (
          <label key={font.id} className="relative flex min-w-0">
            <input
              type="radio"
              name={name}
              value={font.id}
              checked={font.id === value}
              onChange={() => onChange(font.id)}
              className="peer absolute inset-0 size-full appearance-none opacity-0 outline-none"
            />
            <span className="flex min-h-11 w-full min-w-0 flex-col items-center justify-center rounded-xl border border-line px-1 py-1.5 text-center peer-checked:border-accent/70 peer-checked:bg-faint peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus forced-colors:peer-checked:bg-[Highlight] forced-colors:peer-checked:text-[HighlightText]">
              <span
                aria-hidden="true"
                data-font-sample=""
                lang="ar"
                dir="rtl"
                className="text-2xl leading-[1.8]"
                style={{ fontFamily: `"${font.family}", serif` }}
              >
                {FONT_SAMPLE}
              </span>
              <span className="text-xs wrap-anywhere text-muted">{font.family}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
