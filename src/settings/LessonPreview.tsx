import { useMemo } from "react";
import { unlockedMarks } from "~/practice/ladder.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import type { Trainer } from "~/typing/useTrainer.ts";
import { previewSession } from "./previewSession.ts";
import type { LessonDisplaySettings } from "./settings.ts";

const NOTHING = (): void => undefined;

export interface LessonPreviewProps {
  readonly settings: LessonDisplaySettings;
  readonly lines: number;
}

export function LessonPreview({ settings, lines }: LessonPreviewProps) {
  const { profile } = useProfile();
  const { unlocked } = profile.ladder;
  const { vocalization, requireBackspace } = settings;
  const trainer = useMemo<Trainer>(
    () => ({
      session: previewSession({ vocalization, unlockedMarks: unlockedMarks({ unlocked }), requireBackspace }),
      options: { requireBackspace },
      focused: true,
      wrongLayout: false,
      inputRef: { current: null },
      inputProps: {},
      focus: NOTHING,
      restart: NOTHING,
    }),
    [vocalization, unlocked, requireBackspace],
  );
  return (
    <div data-preview="" inert aria-hidden="true">
      <TypingSurface trainer={trainer} settings={settings} preview={{ lines }} />
    </div>
  );
}
