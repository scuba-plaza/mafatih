import { useSyncExternalStore } from "react";

const KEYBOARD_SHARE = 0.2;
const ZOOMED = 1.02;

export interface Tallest {
  readonly width: number;
  readonly height: number;
}

export interface Measure {
  readonly tallest: number;
  readonly visible: number;
  readonly scale: number;
  readonly typing: boolean;
}

export function tallestSeen(previous: Tallest, width: number, height: number): Tallest {
  return previous.width === width ? { width, height: Math.max(previous.height, height) } : { width, height };
}

export function softKeyboardOpen({ tallest, visible, scale, typing }: Measure): boolean {
  return typing && scale <= ZOOMED && tallest > 0 && tallest - visible > tallest * KEYBOARD_SHARE;
}

let memory: Tallest = { width: 0, height: 0 };

function typingInAField(): boolean {
  const { activeElement } = document;
  return activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;
}

function subscribe(onChange: () => void): () => void {
  const viewport = window.visualViewport;
  viewport?.addEventListener("resize", onChange);
  window.addEventListener("resize", onChange);
  document.addEventListener("focusin", onChange);
  document.addEventListener("focusout", onChange);
  return () => {
    viewport?.removeEventListener("resize", onChange);
    window.removeEventListener("resize", onChange);
    document.removeEventListener("focusin", onChange);
    document.removeEventListener("focusout", onChange);
  };
}

function read(): boolean {
  const viewport = window.visualViewport;
  if (viewport === null) {
    return false;
  }
  memory = tallestSeen(memory, window.innerWidth, window.innerHeight);
  return softKeyboardOpen({
    tallest: memory.height,
    visible: viewport.height,
    scale: viewport.scale,
    typing: typingInAField(),
  });
}

export function useSoftKeyboard(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}
