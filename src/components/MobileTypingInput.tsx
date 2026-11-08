import { type RefObject, useEffect } from "react";
import { isTypedKey } from "~/engine/session/session.ts";
import { charsOf, LATIN } from "~/hooks/useTypingKeys.ts";

export interface MobileTypingInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  active: boolean;
  onText: (key: string, at: number) => void;
  onLatin: () => void;
}

export default function MobileTypingInput({ inputRef, active, onText, onLatin }: MobileTypingInputProps) {
  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    if (active) {
      input.focus({ preventScroll: true });
    } else {
      input.blur();
    }
  }, [inputRef, active]);

  useEffect(() => {
    const input = inputRef.current;
    if (input === null) {
      return;
    }
    const onBeforeInput = (event: InputEvent) => {
      event.preventDefault();
      if (event.inputType === "deleteContentBackward") {
        onText("Backspace", event.timeStamp);
        return;
      }
      for (const char of charsOf(event.data)) {
        if (LATIN.test(char)) {
          onLatin();
        } else if (isTypedKey(char)) {
          onText(char, event.timeStamp);
        }
      }
    };
    input.addEventListener("beforeinput", onBeforeInput);
    return () => input.removeEventListener("beforeinput", onBeforeInput);
  }, [inputRef, onText, onLatin]);

  return (
    <input
      ref={inputRef}
      type="text"
      data-typing-input="true"
      data-cy="mobile-typing-input"
      aria-label="Arabic typing input"
      tabIndex={-1}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      enterKeyHint="done"
      className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      style={{ fontSize: "16px" }}
    />
  );
}
