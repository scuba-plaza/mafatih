import { useCallback, useEffect, useState } from "react";

export type Page = "recitation" | "custom" | "stats" | "privacy";

export type Route =
  | { page: "custom" }
  | { page: "stats" }
  | { page: "privacy" }
  | { page: "recitation"; surah: number | null; ayah: number | null };

export type Target = { mode: "custom" } | { mode: "recite"; surah: number; ayah: number | null };

export const PAGE_ROUTE: Record<Page, Route> = {
  recitation: { page: "recitation", surah: null, ayah: null },
  custom: { page: "custom" },
  stats: { page: "stats" },
  privacy: { page: "privacy" },
};

function positiveInt(raw: string | undefined): number | null {
  if (raw === undefined || !/^\d+$/.test(raw)) {
    return null;
  }
  const value = Number(raw);
  return value > 0 ? value : null;
}

export function parseRoute(hash: string): Route {
  const [page, ...rest] = hash.replace(/^#\/?/, "").split("/");
  if (page === "stats" || page === "custom" || page === "privacy") {
    return PAGE_ROUTE[page];
  }
  if (page !== "recitation") {
    return PAGE_ROUTE.recitation;
  }
  const surah = positiveInt(rest[0]);
  return { page, surah, ayah: surah === null ? null : positiveInt(rest[1]) };
}

export function hrefOf(route: Route): string {
  if (route.page === "recitation") {
    if (route.surah === null) {
      return "#/";
    }
    return route.ayah === null ? `#/recitation/${route.surah}` : `#/recitation/${route.surah}/${route.ayah}`;
  }
  return `#/${route.page}`;
}

export function recitationHref(surah: number, ayah: number): string {
  return hrefOf({ page: "recitation", surah, ayah });
}

export function targetOf(route: Route): Target | null {
  if (route.page === "custom") {
    return { mode: "custom" };
  }
  if (route.page === "recitation" && route.surah !== null) {
    return { mode: "recite", surah: route.surah, ayah: route.ayah };
  }
  return null;
}

export interface Router {
  route: Route;
  replace: (route: Route) => void;
}

function currentRoute(): Route {
  return typeof window === "undefined" ? PAGE_ROUTE.recitation : parseRoute(window.location.hash);
}

export function useRoute(): Router {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHashChange);
    onHashChange();
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const replace = useCallback((next: Route) => {
    window.history.replaceState(window.history.state, "", hrefOf(next));
    setRoute(currentRoute());
  }, []);

  return { route, replace };
}
