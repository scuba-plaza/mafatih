import { useSyncExternalStore } from "react";

const KEYBOARD_SHARE = 0.2;

export function softKeyboardOpen(windowHeight: number, visibleHeight: number): boolean {
  return windowHeight > 0 && windowHeight - visibleHeight > windowHeight * KEYBOARD_SHARE;
}

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  return () => viewport?.removeEventListener("resize", onChange);
}

function read(): boolean {
  const viewport = window.visualViewport;
  return viewport !== null && softKeyboardOpen(window.innerHeight, viewport.height);
}

export function useSoftKeyboard(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
