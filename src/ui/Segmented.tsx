import { useId } from "react";

export interface SegmentedOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

export interface SegmentedProps<Value extends string> {
  readonly legend: string;
  readonly value: Value;
  readonly options: readonly SegmentedOption<Value>[];
  readonly onChange: (value: Value) => void;
}

export function Segmented<Value extends string>({ legend, value, options, onChange }: SegmentedProps<Value>) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-2 text-sm text-muted">{legend}</legend>
      <div className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-xl border border-line p-1">
        {options.map((option) => (
          <label key={option.value} className="relative flex">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="peer absolute inset-0 size-full appearance-none opacity-0 outline-none"
            />
            <span
              data-segment=""
              className="flex min-h-11 items-center rounded-lg border border-transparent px-4 text-sm text-muted peer-checked:border-accent/60 peer-checked:bg-faint peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus forced-colors:peer-checked:bg-[Highlight] forced-colors:peer-checked:text-[HighlightText]"
            >
              {option.label}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
