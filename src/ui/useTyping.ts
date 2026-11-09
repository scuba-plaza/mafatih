import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import { applyKey, beginTyping, type TypingState } from "~/engine/typing.ts";

export function useTyping(target: string, onFinish: (state: TypingState) => void) {
  const [state, setState] = useState<TypingState>(() => beginTyping(target));
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  const current = state.target === target ? state : beginTyping(target);

  useEffect(() => {
    if (current.done) {
      finishRef.current(current);
    }
  }, [current]);

  const typeChar = (char: string) => {
    setState((latest) => applyKey(latest, char, Date.now()));
  };

  const backspace = () => {
    setState((latest) => applyKey(latest, "\b", Date.now()));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      backspace();
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      typeChar(event.key);
    }
  };

  return { state: current, typeChar, backspace, handleKeyDown };
}
