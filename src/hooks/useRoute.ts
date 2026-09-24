import { useEffect, useState } from "react";

export type Route = "practice" | "story" | "stats";

export const ROUTE_HASH: Record<Route, string> = {
  practice: "#/",
  story: "#/story",
  stats: "#/stats",
};

function routeOf(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  return path === "stats" || path === "story" ? path : "practice";
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
