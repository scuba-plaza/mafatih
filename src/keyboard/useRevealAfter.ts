import { useEffect, useState } from "react";

export function useRevealAfter(position: string, delayMs: number, immediate: boolean): boolean {
  const [revealedAt, setRevealedAt] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setRevealedAt(position), delayMs);
    return () => {
      window.clearTimeout(timer);
      setRevealedAt("");
    };
  }, [position, delayMs]);

  return delayMs === 0 || immediate || revealedAt === position;
}
