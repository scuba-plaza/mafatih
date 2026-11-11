import { useEffect, useMemo, useSyncExternalStore } from "react";
import { formatRoute, parseRoute, type Route } from "./routes.ts";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function currentHash(): string {
  return window.location.hash;
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, currentHash);
  const route = useMemo(() => parseRoute(hash), [hash]);

  useEffect(() => {
    const canonical = formatRoute(route);
    if (hash !== "" && hash !== canonical) {
      window.history.replaceState(null, "", canonical);
    }
  }, [hash, route]);

  return route;
}
