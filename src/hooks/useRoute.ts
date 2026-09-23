import { useEffect, useState } from "react";

export type Route = "practice" | "stats";

export const ROUTE_HASH: Record<Route, string> = {
  practice: "#/",
  stats: "#/stats",
};

function routeOf(hash: string): Route {
  return hash.replace(/^#\/?/, "") === "stats" ? "stats" : "practice";
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === "undefined" ? "practice" : routeOf(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setRoute(routeOf(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}
