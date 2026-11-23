import type { MessageKey } from "~/i18n/en.ts";

export const GROUP_IDS = ["general", "lesson", "recitation", "data"] as const;

export type GroupId = (typeof GROUP_IDS)[number];

export const GROUP_TITLE: Readonly<Record<GroupId, MessageKey>> = {
  general: "settings.group.general",
  lesson: "settings.group.lesson",
  recitation: "settings.group.recitation",
  data: "settings.group.data",
};

export const WIDE_QUERY = "(min-width: 48rem)";
