import { useLayoutEffect, useRef, useState } from "react";

interface TypingLineProps {
  target: string;
  typed: string;
  wrong: string | null;
}

export function TypingLine({ target, typed, wrong }: TypingLineProps) {
  const baseRef = useRef<HTMLSpanElement>(null);
  const [insetLeft, setInsetLeft] = useState<number | null>(null);

  useLayoutEffect(() => {
    const element = baseRef.current;
    const textNode = element?.firstChild;
    if (element === null || element === undefined || !(textNode instanceof Text) || typed.length === 0) {
      setInsetLeft(null);
      return;
    }
    const range = document.createRange();
    range.setStart(textNode, 0);
    range.setEnd(textNode, typed.length);
    const boundary = range.getBoundingClientRect().left;
    const box = element.getBoundingClientRect();
    setInsetLeft(Math.max(0, boundary - box.left));
  }, [target, typed]);

  return (
    <span
      className={`typing-line relative inline-block ${wrong !== null ? "animate-pulse text-red-700 dark:text-red-400" : ""}`}
    >
      <span ref={baseRef}>{target}</span>
      {typed.length > 0 ? (
        <span
          aria-hidden="true"
          className="typing-line typing-done absolute inset-0"
          style={{ clipPath: `inset(0 0 0 ${insetLeft ?? 0}px)` }}
        >
          {target}
        </span>
      ) : null}
    </span>
  );
}
