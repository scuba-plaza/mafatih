import { useMemo, useState } from "react";
import { composeDrill } from "~/engine/drills.ts";
import {
  advance,
  effectiveTier,
  focusLetter,
  type Progress,
  recentAccuracy,
  recordAttempt,
} from "~/engine/progression.ts";
import { accuracyOf } from "~/engine/typing.ts";
import { Keyboard } from "./Keyboard.tsx";
import { TypingArea } from "./TypingArea.tsx";
import { useTyping } from "./useTyping.ts";

interface PracticeViewProps {
  words: readonly string[];
  progress: Progress;
  tierOverride: "auto" | "none" | "core" | "full";
  fingerColors: boolean;
  onProgress: (progress: Progress) => void;
}

export function PracticeView({ words, progress, tierOverride, fingerColors, onProgress }: PracticeViewProps) {
  const [drillIndex, setDrillIndex] = useState(0);
  const [lastAccuracy, setLastAccuracy] = useState<number | null>(null);
  const tier = effectiveTier(progress, tierOverride);
  const focus = focusLetter(progress);
  const unlocked = useMemo(() => new Set(progress.unlocked), [progress.unlocked]);
  const drill = useMemo(
    () =>
      composeDrill({
        words,
        unlocked,
        tier,
        focus,
        count: 7,
        rand: () => Math.random(),
      }),
    [words, unlocked, tier, focus, drillIndex],
  );

  const { state, handleKeyDown, typeChar } = useTyping(drill, (finished) => {
    let next = progress;
    for (const attempt of finished.attempts) {
      next = recordAttempt(next, attempt.char, attempt.correct);
    }
    next = advance(next);
    setLastAccuracy(accuracyOf(finished));
    onProgress(next);
    setDrillIndex((index) => index + 1);
  });

  const focusStat = progress.stats[focus];

  return (
    <section aria-labelledby="practice-heading" className="mx-auto flex max-w-3xl flex-col gap-6 px-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 id="practice-heading" className="text-xl font-semibold">
          Practice
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Focus letter <span lang="ar">{focus}</span>
          {focusStat !== undefined ? ` · ${Math.round(recentAccuracy(focusStat) * 100)}% recent` : ""} ·{" "}
          {progress.unlocked.length}/36 letters · harakat: {tier}
        </p>
      </div>

      {drill === "" ? (
        <p role="status" className="text-stone-600 dark:text-stone-300">
          No drill matches your unlocked letters yet. Type the letters you have in Recitation to unlock more.
        </p>
      ) : (
        <TypingArea
          target={drill}
          typed={state.typed}
          wrong={state.wrong}
          onKeyDown={handleKeyDown}
          onChar={typeChar}
        />
      )}

      <Keyboard
        remaining={drill === "" ? "" : drill.slice(state.typed.length)}
        wrong={state.wrong}
        colored={fingerColors}
      />

      <p role="status" aria-live="polite" className="min-h-6 text-center text-sm text-stone-600 dark:text-stone-300">
        {state.done
          ? "Drill complete."
          : lastAccuracy === null
            ? "Click the text, then type. Backspace fixes a wrong key."
            : `Last drill: ${Math.round((lastAccuracy ?? 0) * 100)}% accuracy.`}
      </p>
    </section>
  );
}
