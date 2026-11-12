import { useId } from "react";

export interface SwitchProps {
  readonly label: string;
  readonly hint?: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export function Switch({ label, hint, checked, onChange }: SwitchProps) {
  const labelId = useId();
  const hintId = useId();
  return (
    <label className="flex min-h-11 items-start gap-3 py-2">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={labelId}
        aria-describedby={hint === undefined ? undefined : hintId}
        className="relative mt-0.5 h-6 w-11 shrink-0 appearance-none rounded-full border border-edge bg-surface before:absolute before:start-0.5 before:top-0.5 before:size-4 before:rounded-full before:bg-ink before:transition-transform checked:border-accent checked:bg-accent checked:before:translate-x-5 checked:before:bg-on-accent rtl:checked:before:-translate-x-5 motion-reduce:before:transition-none forced-colors:appearance-auto forced-colors:before:hidden"
      />
      <span className="flex flex-col">
        <span id={labelId} className="font-medium">
          {label}
        </span>
        {hint !== undefined && (
          <span id={hintId} className="text-sm text-muted">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
