import type { MessageKey } from "~/i18n/en.ts";
import type { Route } from "./routes.ts";

export type Page = Route["page"];

export const PAGE_TITLES: Record<Page, MessageKey> = {
  recitation: "nav.recitation",
  practice: "nav.practice",
  custom: "nav.custom",
  stats: "nav.stats",
  about: "nav.about",
};
