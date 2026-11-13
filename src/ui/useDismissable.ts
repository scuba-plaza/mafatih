import { type RefObject, useEffect } from "react";

export function useDismissable(
  open: boolean,
  close: () => void,
  area: RefObject<HTMLElement | null>,
  opener: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const element = area.current;
    if (!open || element === null) {
      return;
    }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !element.contains(event.target)) {
        close();
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        opener.current?.focus();
      } else if (event.key === "Tab") {
        setTimeout(() => {
          if (!element.contains(document.activeElement)) {
            close();
          }
        });
      }
    };
    document.addEventListener("pointerdown", outside, true);
    element.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      element.removeEventListener("keydown", onKey);
    };
  }, [open, close, area, opener]);
}
