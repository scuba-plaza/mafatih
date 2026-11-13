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
    <label className="flex min-h-11 items-center gap-3 py-1">
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-labelledby={labelId}
        aria-describedby={hint === undefined ? undefined : hintId}
        className="relative h-5 w-9 shrink-0 appearance-none rounded-full border border-edge bg-surface before:absolute before:start-0.5 before:top-0.5 before:size-3.5 before:rounded-full before:bg-ink before:transition-transform checked:border-accent checked:bg-accent checked:before:translate-x-4 checked:before:bg-on-accent rtl:checked:before:-translate-x-4 motion-reduce:before:transition-none forced-colors:appearance-auto forced-colors:before:hidden"
      />
      <span className="flex flex-col">
        <span id={labelId} className="text-sm">
          {label}
        </span>
        {hint !== undefined && (
          <span id={hintId} className="text-xs text-muted">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}
