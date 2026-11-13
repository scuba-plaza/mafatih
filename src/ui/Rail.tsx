export function Rail({ value, className = "" }: { readonly value: number; readonly className?: string }) {
  const share = Math.min(Math.max(value, 0), 1);
  return (
    <div aria-hidden="true" className={`h-0.5 bg-faint forced-colors:bg-[GrayText] ${className}`}>
      <div
        className="h-full bg-accent forced-colors:bg-[Highlight] shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]"
        style={{ width: `${share * 100}%` }}
      />
    </div>
  );
}
