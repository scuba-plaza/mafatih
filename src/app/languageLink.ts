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

export function takeLanguageFromAddress(place: AddressLike, history: HistoryLike): Language | null {
  const language = languageFromSearch(place.search);
  if (language === null) {
    return null;
  }
  const rest = new URLSearchParams(place.search);
  rest.delete("lang");
  const query = rest.toString();
  history.replaceState(history.state, "", `${place.pathname}${query === "" ? "" : `?${query}`}${place.hash}`);
  return language;
}
