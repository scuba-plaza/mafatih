import { type RefObject, useEffect } from "react";

const INSET = "--keyboard-dock-inset";

export function useDockInset(dock: RefObject<HTMLElement | null>, docked: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    const element = dock.current;
    if (!docked || element === null) {
      root.style.setProperty(INSET, "0px");
      return;
    }
    const measure = () => {
      const offset = Number.parseFloat(getComputedStyle(element).bottom) || 0;
      root.style.setProperty(INSET, `${element.offsetHeight + offset}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => {
      observer.disconnect();
      root.style.setProperty(INSET, "0px");
    };
  }, [dock, docked]);
}
