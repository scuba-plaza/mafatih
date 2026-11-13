import { type Language, languageFromSearch } from "~/i18n/i18n.ts";

export interface AddressLike {
  readonly search: string;
  readonly pathname: string;
  readonly hash: string;
}

export interface HistoryLike {
  readonly state: unknown;
  readonly replaceState: (state: unknown, unused: string, url: string) => void;
}

function queryOf(text: string): string {
  const at = text.indexOf("?");
  return at === -1 ? "" : text.slice(at);
}

function withoutLanguage(query: string): string {
  const rest = new URLSearchParams(query);
  rest.delete("lang");
  const text = rest.toString();
  return text === "" ? "" : `?${text}`;
}

export function takeLanguageFromAddress(place: AddressLike, history: HistoryLike): Language | null {
  const hashQuery = queryOf(place.hash);
  const language = languageFromSearch(place.search) ?? languageFromSearch(hashQuery);
  if (language === null) {
    return null;
  }
  const route = place.hash.slice(0, place.hash.length - hashQuery.length);
  history.replaceState(
    history.state,
    "",
    `${place.pathname}${withoutLanguage(place.search)}${route}${withoutLanguage(hashQuery)}`,
  );
  return language;
}
