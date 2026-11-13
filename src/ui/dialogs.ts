import { useSyncExternalStore } from "react";

const CHANGED = "mafatih:dialogs";

export function announceDialogChange(): void {
  window.dispatchEvent(new Event(CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(CHANGED, onChange);
  return () => window.removeEventListener(CHANGED, onChange);
}

function anyDialogOpen(): boolean {
  return document.querySelector("dialog[open]") !== null;
}

export function useDialogOpen(): boolean {
  return useSyncExternalStore(subscribe, anyDialogOpen);
}
