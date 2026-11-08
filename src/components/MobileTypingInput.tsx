import { type FormEvent, type RefObject, useEffect } from "react";
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

  const onBeforeInput = (event: FormEvent<HTMLInputElement>) => {
    const input = event.nativeEvent as InputEvent;
    event.preventDefault();
    for (const char of charsOf(input.data)) {
      if (LATIN.test(char)) {
        onLatin();
      } else if (isTypedKey(char)) {
        onText(char, input.timeStamp);
      }
    }
  };

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
      onBeforeInput={onBeforeInput}
      className="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      style={{ fontSize: "16px" }}
    />
  );
}
