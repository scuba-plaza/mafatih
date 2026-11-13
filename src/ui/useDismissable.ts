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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
        opener.current?.focus();
      }
    };
    const leaves = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && !element.contains(event.relatedTarget)) {
        close();
      }
    };
    document.addEventListener("pointerdown", outside, true);
    element.addEventListener("keydown", closeOnEscape);
    element.addEventListener("focusout", leaves);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      element.removeEventListener("keydown", closeOnEscape);
      element.removeEventListener("focusout", leaves);
    };
  }, [open, close, area, opener]);
}
