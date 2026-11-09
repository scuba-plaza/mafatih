import { type KeyboardEvent as ReactKeyboardEvent, useEffect, useRef, useState } from "react";
import { applyKey, beginTyping, type TypingState } from "~/engine/typing.ts";

export function useTyping(target: string, onFinish: (state: TypingState) => void) {
  const [state, setState] = useState<TypingState>(() => beginTyping(target));
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useEffect(() => {
    setState(beginTyping(target));
  }, [target]);

  useEffect(() => {
    if (state.done) {
      finishRef.current(state);
    }
  }, [state]);

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      setState((current) => applyKey(current, "\b", Date.now()));
      return;
    }
    if (event.key.length === 1) {
      event.preventDefault();
      setState((current) => applyKey(current, event.key, Date.now()));
    }
  };

  return { state, handleKeyDown };
}
