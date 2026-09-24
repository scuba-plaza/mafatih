import type { SyntheticEvent } from "react";

export const PRIMARY_BUTTON =
  "rounded-full bg-stone-900 px-4 text-xs font-medium text-stone-50 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300";

export function blur(event: SyntheticEvent<HTMLElement>): void {
  event.currentTarget.blur();
}

export function blurAfter(run: () => void) {
  return (event: SyntheticEvent<HTMLElement>): void => {
    run();
    event.currentTarget.blur();
  };
}

export function scrollBehavior(): ScrollBehavior {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
