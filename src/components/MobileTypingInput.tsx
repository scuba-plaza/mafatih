import { type RefObject, useEffect } from "react";

export interface MobileTypingInputProps {
  inputRef: RefObject<HTMLInputElement | null>;
  active: boolean;
}

export default function MobileTypingInput({ inputRef, active }: MobileTypingInputProps) {
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
      onInput={(event) => {
        event.currentTarget.value = "";
      }}
      className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      style={{ fontSize: "16px" }}
    />
  );
}
