import type { ReactNode } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { GROUP_IDS, GROUP_TITLE, type GroupId } from "./groups.ts";

export interface GroupNavProps {
  readonly variant: "list" | "rail";
  readonly active: GroupId | null;
  readonly summaries: Readonly<Record<GroupId, ReactNode>>;
  readonly onChoose: (group: GroupId) => void;
}

export function GroupNav({ variant, active, summaries, onChoose }: GroupNavProps) {
  const { t } = useI18n();
  const list = variant === "list";
  return (
    <nav
      aria-label={t("settings.groups")}
      className={
        list ? "flex w-full flex-col" : "flex w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-e border-line p-2"
      }
    >
      {GROUP_IDS.map((id) => (
        <button
          key={id}
          type="button"
          aria-current={!list && id === active ? "true" : undefined}
          onClick={() => onChoose(id)}
          className={
            list
              ? "flex min-h-14 items-center gap-3 border-b border-line py-2 text-start last:border-b-0"
              : "group flex min-h-14 min-w-0 flex-col justify-center rounded-lg px-3 py-1.5 text-start aria-[current=true]:bg-faint"
          }
        >
          <span className={list ? "shrink-0 font-medium" : "font-medium group-aria-[current=true]:text-accent"}>
            {t(GROUP_TITLE[id])}
          </span>
          <span data-summary="" className={`min-w-0 truncate text-sm text-muted ${list ? "flex-1 text-end" : ""}`}>
            {summaries[id]}
          </span>
          {list && (
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 -rotate-45 border-e-2 border-b-2 border-edge rtl:rotate-45"
            />
          )}
        </button>
      ))}
    </nav>
  );
}
