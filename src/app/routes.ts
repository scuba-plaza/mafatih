export type Route =
  | { page: "recitation"; surah: number | null; ayah: number | null }
  | { page: "practice" }
  | { page: "custom" }
  | { page: "stats" }
  | { page: "about" };

export type RecitationRoute = Extract<Route, { page: "recitation" }>;

const SURAHS = 114;
const LONGEST_SURAH = 286;
const WHOLE = /^[1-9]\d{0,2}$/;
const HOME: Route = { page: "recitation", surah: null, ayah: null };

function whole(text: string | undefined, most: number): number | null {
  return text !== undefined && WHOLE.test(text) && Number(text) <= most ? Number(text) : null;
}

function recitation(parts: readonly string[]): Route {
  if (parts.length > 2) {
    return HOME;
  }
  const surah = whole(parts[0], SURAHS);
  return surah === null ? HOME : { page: "recitation", surah, ayah: whole(parts[1], LONGEST_SURAH) };
}

export function parseRoute(hash: string): Route {
  const [page, ...rest] = (hash.split("?")[0] ?? "").replace(/^#\/?/, "").split("/").filter(Boolean);
  if (page === "recitation") {
    return recitation(rest);
  }
  if ((page === "practice" || page === "custom" || page === "stats" || page === "about") && rest.length === 0) {
    return { page };
  }
  return HOME;
}

export function formatRoute(route: Route): string {
  if (route.page !== "recitation") {
    return `#/${route.page}`;
  }
  if (route.surah === null) {
    return "#/";
  }
  return route.ayah === null ? `#/recitation/${route.surah}` : `#/recitation/${route.surah}/${route.ayah}`;
}
