import { useSyncExternalStore } from "react";
import { parseRoute, type Route } from "./routes.ts";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function currentHash(): string {
  return window.location.hash;
}

export function useRoute(): Route {
  return parseRoute(useSyncExternalStore(subscribe, currentHash));
}
