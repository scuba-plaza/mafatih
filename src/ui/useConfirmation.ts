import { type RefObject, useEffect, useRef, useState } from "react";

export interface Confirmation {
  readonly confirming: boolean;
  readonly opener: RefObject<HTMLButtonElement | null>;
  readonly ask: () => void;
  readonly settle: () => void;
}

export function useConfirmation(): Confirmation {
  const [confirming, setConfirming] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!confirming && restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [confirming]);

  return {
    confirming,
    opener,
    ask: () => setConfirming(true),
    settle: () => {
      restoreFocus.current = true;
      setConfirming(false);
    },
  };
}
