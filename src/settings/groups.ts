import type { MessageKey } from "~/i18n/en.ts";

export const GROUP_IDS = ["general", "lesson", "recitation"] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const GROUP_TITLE: Readonly<Record<GroupId, MessageKey>> = {
  general: "settings.group.general",
  lesson: "settings.group.lesson",
  recitation: "settings.group.recitation",
};

export const WIDE_QUERY = "(min-width: 48rem)";
export const TRIPLE_QUERY = "(min-width: 64rem) and (pointer: fine)";
export const TALL_QUERY = "(min-height: 36rem)";
