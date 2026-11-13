import { type ReactNode, useId } from "react";

export interface RadioOption<Value extends string> {
  readonly value: Value;
  readonly label: string;
  readonly hint?: string;
  readonly lang?: string;
  readonly preview?: ReactNode;
}

export interface RadioGroupProps<Value extends string> {
  readonly legend: string;
  readonly value: Value;
  readonly options: readonly RadioOption<Value>[];
  readonly onChange: (value: Value) => void;
}

interface RadioProps<Value extends string> {
  readonly name: string;
  readonly option: RadioOption<Value>;
  readonly checked: boolean;
  readonly onChange: (value: Value) => void;
}

function Radio<Value extends string>({ name, option, checked, onChange }: RadioProps<Value>) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="flex min-h-11 items-start gap-3 py-2">
      <input
        type="radio"
        name={name}
        value={option.value}
        checked={checked}
        onChange={() => onChange(option.value)}
        aria-labelledby={labelId}
        aria-describedby={option.hint === undefined ? undefined : hintId}
        className="relative mt-0.5 size-5 shrink-0 appearance-none rounded-full border border-edge before:absolute before:inset-1 before:rounded-full before:bg-accent before:opacity-0 checked:border-accent checked:before:opacity-100 forced-colors:appearance-auto forced-colors:before:hidden"
      />
      <span className="flex min-w-0 flex-col wrap-anywhere">
        <span id={labelId} lang={option.lang} className="font-medium">
          {option.label}
        </span>
        {option.hint !== undefined && (
          <span id={hintId} className="text-sm text-muted">
            {option.hint}
          </span>
        )}
        {option.preview}
      </span>
    </label>
  );
}

export function RadioGroup<Value extends string>({ legend, value, options, onChange }: RadioGroupProps<Value>) {
  const name = useId();
  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-1 font-medium">{legend}</legend>
      <div className="flex flex-col">
        {options.map((option) => (
          <Radio key={option.value} name={name} option={option} checked={option.value === value} onChange={onChange} />
        ))}
      </div>
    </fieldset>
  );
}
