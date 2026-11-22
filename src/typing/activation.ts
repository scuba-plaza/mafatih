export interface ActivationKey {
  readonly key: string;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly altKey: boolean;
  readonly repeat: boolean;
  readonly isComposing: boolean;
  readonly onControl: boolean;
}

const CONTROL =
  'a[href], button, input, select, textarea, summary, dialog, [contenteditable], [role="button"], [tabindex]:not([tabindex="-1"])';

export function activatesOnEnter(event: ActivationKey): boolean {
  return (
    event.key === "Enter" &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !event.repeat &&
    !event.isComposing &&
    !event.onControl
  );
}

interface CanFindAncestor {
  readonly closest: (selector: string) => unknown;
}

function canFindAncestor(target: unknown): target is CanFindAncestor {
  return typeof target === "object" && target !== null && "closest" in target && typeof target.closest === "function";
}

export function isOnControl(target: EventTarget | null): boolean {
  return canFindAncestor(target) && target.closest(CONTROL) !== null;
}
