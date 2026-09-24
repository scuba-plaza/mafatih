import { type RefObject, useEffect } from "react";
import { isTypedKey } from "~/engine/session/session.ts";

const LATIN = /^[A-Za-z]$/;

const PREVENTED_KEYS: readonly string[] = [" ", "Backspace", "Tab"];

const PASSTHROUGH_TAGS: readonly string[] = ["INPUT", "SELECT", "TEXTAREA", "BUTTON"];

const PASSAGE_KEYS: Readonly<Record<string, 1 | -1>> = { PageDown: 1, PageUp: -1 };

export interface TypingKeyHandlers {
  listening: boolean;
  typing: boolean;
  onKey: (key: string, at: number) => void;
  onStep: (direction: 1 | -1) => boolean;
  onLatin: () => void;
  onShift: (held: boolean) => void;
}

export function useTypingKeys(handlers: RefObject<TypingKeyHandlers>): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const current = handlers.current;
      if (!current.listening || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      const direction = PASSAGE_KEYS[event.key];
      if (direction !== undefined) {
        if (current.onStep(direction)) {
          event.preventDefault();
        }
        return;
      }
      if (event.key === "Shift") {
        current.onShift(true);
        return;
      }
      const target = event.target;
      if (!current.typing || (target instanceof HTMLElement && PASSTHROUGH_TAGS.includes(target.tagName))) {
        return;
      }
      if (LATIN.test(event.key)) {
        event.preventDefault();
        current.onLatin();
        return;
      }
      if (PREVENTED_KEYS.includes(event.key)) {
        event.preventDefault();
      }
      if (isTypedKey(event.key)) {
        current.onKey(event.key, event.timeStamp);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Shift") {
        handlers.current.onShift(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handlers]);
}
