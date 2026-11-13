import { type FormEvent, type InputHTMLAttributes, type RefObject, useEffect, useRef, useState } from "react";
import { diffInput, INPUT_SENTINEL } from "./input.ts";
import type { Key } from "./session.ts";

export interface TypingInputOptions {
  readonly onKey: (key: Key, at: number) => void;
  readonly onWrongLayout: () => void;
}

export interface TypingInput {
  readonly ref: RefObject<HTMLInputElement | null>;
  readonly focused: boolean;
  readonly inputProps: InputHTMLAttributes<HTMLInputElement>;
}

const FORWARD_DELETE = /^delete.*Forward$/;

function caretToEnd(input: HTMLInputElement): void {
  input.setSelectionRange(input.value.length, input.value.length);
}

export function useTypingInput({ onKey, onWrongLayout }: TypingInputOptions): TypingInput {
  const ref = useRef<HTMLInputElement>(null);
  const previous = useRef(INPUT_SENTINEL);
  const [focused, setFocused] = useState(false);

  const reset = (input: HTMLInputElement) => {
    input.value = INPUT_SENTINEL;
    previous.current = INPUT_SENTINEL;
    caretToEnd(input);
  };

  const onInput = (event: FormEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const native = event.nativeEvent;
    const typed = native instanceof InputEvent ? native : undefined;
    const forwardDelete = typed !== undefined && FORWARD_DELETE.test(typed.inputType);
    if (document.activeElement === input && !forwardDelete) {
      const change = diffInput(previous.current, input.value);
      for (const key of change.keys) {
        onKey(key, native.timeStamp);
      }
      if (change.wrongLayout) {
        onWrongLayout();
      }
    }
    if (typed?.isComposing === true) {
      previous.current = input.value;
    } else {
      reset(input);
    }
  };

  useEffect(() => {
    const keepCaretAtEnd = () => {
      const input = ref.current;
      if (input !== null && document.activeElement === input && input.selectionStart !== input.value.length) {
        caretToEnd(input);
      }
    };
    document.addEventListener("selectionchange", keepCaretAtEnd);
    return () => document.removeEventListener("selectionchange", keepCaretAtEnd);
  }, []);

  return {
    ref,
    focused,
    inputProps: {
      defaultValue: INPUT_SENTINEL,
      onInput,
      onKeyDown: (event) => {
        if (event.repeat && event.key !== "Backspace" && !event.nativeEvent.isComposing) {
          event.preventDefault();
        }
      },
      onCompositionEnd: (event) => reset(event.currentTarget),
      onFocus: (event) => {
        reset(event.currentTarget);
        setFocused(true);
      },
      onBlur: () => setFocused(false),
      autoComplete: "off",
      autoCorrect: "off",
      autoCapitalize: "off",
      spellCheck: false,
      enterKeyHint: "done",
      lang: "ar",
      dir: "rtl",
    },
  };
}
