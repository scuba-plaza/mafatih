export type Route =
  | { page: "recitation"; surah: number | null; ayah: number | null }
  | { page: "practice" }
  | { page: "custom" }
  | { page: "stats" }
  | { page: "about" };

const SURAHS = 114;
const WHOLE = /^[1-9]\d*$/;
const HOME: Route = { page: "recitation", surah: null, ayah: null };

function whole(text: string | undefined): number | null {
  return text !== undefined && WHOLE.test(text) ? Number(text) : null;
}

function recitation(parts: readonly string[]): Route {
  if (parts.length > 2) {
    return HOME;
  }
  const surah = whole(parts[0]);
  if (surah === null || surah > SURAHS) {
    return HOME;
  }
  return { page: "recitation", surah, ayah: whole(parts[1]) };
}

export function parseRoute(hash: string): Route {
  const [page, ...rest] = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
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
