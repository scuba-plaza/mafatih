export interface LayoutGuardProps {
  latinDetected: boolean;
  onDismiss: () => void;
}

export default function LayoutGuard({ latinDetected, onDismiss }: LayoutGuardProps) {
  if (!latinDetected) {
    return null;
  }
  return (
    <div
      data-cy="layout-guard"
      role="alert"
      className="border-l-2 border-amber-500 pl-4 text-sm text-amber-700 dark:text-amber-400"
    >
      <p className="font-medium">Your keyboard is not sending Arabic.</p>
      <p className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/70">
        Mafatih reads the characters your OS produces, so switch to the Arabic layout before typing — on Linux{" "}
        <code className="font-mono">setxkbmap ara</code>. Keystrokes are not scored until then.
      </p>
      <button
        type="button"
        data-cy="layout-guard-dismiss"
        onClick={onDismiss}
        className="mt-2 text-xs text-amber-700/70 underline underline-offset-2 hover:text-amber-900 dark:text-amber-400/70 dark:hover:text-amber-200"
      >
        Dismiss
      </button>
    </div>
  );
}
