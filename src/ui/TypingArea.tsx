import type { InputEvent as ReactInputEvent, KeyboardEvent as ReactKeyboardEvent } from "react";
import { TypingLine } from "./TypingLine.tsx";

interface TypingAreaProps {
  target: string;
  typed: string;
  wrong: string | null;
  onKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  onChar: (char: string) => void;
}

export function TypingArea({ target, typed, wrong, onKeyDown, onChar }: TypingAreaProps) {
  return (
    <div className="relative rounded-xl border border-stone-300 bg-white p-6 text-center dark:border-stone-700 dark:bg-stone-900">
      <TypingLine target={target} typed={typed} wrong={wrong} />
      <input
        value=""
        onChange={() => undefined}
        onKeyDown={onKeyDown}
        onBeforeInput={(event: ReactInputEvent<HTMLInputElement>) => {
          const data = event.nativeEvent.data;
          if (data !== null) {
            for (const char of data) {
              onChar(char);
            }
          }
          event.preventDefault();
        }}
        aria-label="Typing area. Type the Arabic text shown."
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
        className="absolute inset-0 h-full w-full cursor-default bg-transparent text-transparent caret-transparent outline-none"
      />
    </div>
  );
}
