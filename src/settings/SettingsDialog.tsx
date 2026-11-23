import { type ReactNode, useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { AudioSettings } from "~/recitation/audio/AudioSettings.tsx";
import { RecitationSettings } from "~/recitation/RecitationSettings.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { Dialog, SIDE_PADDING } from "~/ui/Dialog.tsx";
import { useMediaQuery } from "~/ui/useMediaQuery.ts";
import { FONTS, loadFont } from "./fonts.ts";
import { GeneralSettings } from "./GeneralSettings.tsx";
import { GroupNav } from "./GroupNav.tsx";
import { GROUP_TITLE, type GroupId, TALL_QUERY, TRIPLE_QUERY, WIDE_QUERY } from "./groups.ts";
import { LessonPreview } from "./LessonPreview.tsx";
import { KeyboardGuideSettings, LessonControls } from "./LessonSettings.tsx";
import { PreviewPeek } from "./PreviewPeek.tsx";
import { PreviewScale } from "./PreviewScale.tsx";
import type { Settings } from "./settings.ts";
import { useGroupSummaries } from "./useGroupSummaries.tsx";

const SHEET_SIZE =
  "h-[min(43.75rem,90dvh)] md:h-[min(43.75rem,90dvh)]! md:w-[48.75rem] pointer-fine:min-[64rem]:w-[72.5rem]";

export interface SettingsDialogProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const { settings } = profile;
  const wide = useMediaQuery(WIDE_QUERY);
  const triple = useMediaQuery(TRIPLE_QUERY);
  const tall = useMediaQuery(TALL_QUERY);
  const [chosen, setChosen] = useState<GroupId | null>(null);
  const [returnTo, setReturnTo] = useState<GroupId | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const summaries = useGroupSummaries(settings);

  useEffect(() => {
    if (open) {
      for (const font of FONTS) {
        loadFont(font);
      }
    } else {
      setChosen(null);
      setReturnTo(null);
    }
  }, [open]);

  const change = (patch: Partial<Settings>) =>
    update((current) => ({ ...current, settings: { ...current.settings, ...patch } }));

  const active: GroupId | null = wide ? (chosen ?? "general") : chosen;
  const nested = !wide && active !== null;

  useEffect(() => {
    const title = titleRef.current;
    if (nested && title !== null) {
      title.tabIndex = -1;
      title.focus();
    }
  }, [nested]);

  const choose = (group: GroupId) => {
    setReturnTo(null);
    setChosen(group);
  };

  const pane = (id: GroupId): ReactNode => {
    switch (id) {
      case "general":
        return <GeneralSettings settings={settings} change={change} onNavigate={onClose} />;
      case "lesson":
        return <LessonControls settings={settings} change={change} />;
      case "recitation":
        return (
          <>
            <RecitationSettings settings={settings} change={change} />
            <AudioSettings settings={settings} change={change} />
          </>
        );
    }
  };

  const scrolling = (id: GroupId, children: ReactNode, labelled = true): ReactNode => (
    <section
      aria-label={labelled ? t(GROUP_TITLE[id]) : undefined}
      data-settings-scroll=""
      className={`flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${SIDE_PADDING}`}
    >
      {children}
    </section>
  );

  const lesson = (): ReactNode => {
    const preview = (
      <PreviewScale>
        <LessonPreview settings={settings} lines={2} />
      </PreviewScale>
    );
    const guide = <KeyboardGuideSettings settings={settings} change={change} />;
    if (wide && triple) {
      return (
        <section aria-label={t(GROUP_TITLE.lesson)} className="flex min-h-0 min-w-0 flex-1">
          {scrolling("lesson", pane("lesson"), false)}
          <aside className="flex w-[29rem] shrink-0 flex-col gap-5 overflow-y-auto border-s border-line bg-faint p-4">
            {preview}
            {guide}
          </aside>
        </section>
      );
    }
    if (wide) {
      return scrolling(
        "lesson",
        <>
          <div className="sticky top-0 z-10 -mt-4 bg-surface pt-4 pb-3">{preview}</div>
          {pane("lesson")}
          {guide}
        </>,
      );
    }
    if (tall) {
      return (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <PreviewPeek settings={settings} />
          {scrolling("lesson", pane("lesson"))}
        </div>
      );
    }
    return scrolling(
      "lesson",
      <>
        {preview}
        {pane("lesson")}
      </>,
    );
  };

  const content =
    active === null ? (
      <div className={`min-h-0 flex-1 overflow-y-auto ${SIDE_PADDING}`}>
        <GroupNav variant="list" active={null} summaries={summaries} onChoose={choose} focusOn={returnTo} />
      </div>
    ) : active === "lesson" ? (
      lesson()
    ) : (
      scrolling(active, pane(active))
    );

  return (
    <Dialog
      open={open}
      title={nested ? t(GROUP_TITLE[active]) : t("settings.title")}
      label={t("settings.title")}
      closeLabel={t("settings.done")}
      onClose={onClose}
      titleRef={titleRef}
      className={SHEET_SIZE}
      bodyClassName="flex min-h-0 flex-1"
      leading={
        nested ? (
          <button
            type="button"
            aria-label={t("settings.back")}
            onClick={() => {
              setReturnTo(chosen);
              setChosen(null);
            }}
            className="flex min-h-11 items-center gap-1 rounded-lg pe-2 text-sm font-medium text-accent"
          >
            <span
              aria-hidden="true"
              className="size-2.5 rotate-135 border-e-2 border-b-2 border-accent rtl:-rotate-135"
            />
            <span className="@max-[20rem]:sr-only">{t("settings.title")}</span>
          </button>
        ) : undefined
      }
    >
      {wide && <GroupNav variant="rail" active={active} summaries={summaries} onChoose={choose} />}
      {content}
    </Dialog>
  );
}
