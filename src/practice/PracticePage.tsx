import { useCallback, useEffect, useMemo, useState } from "react";
import { useFitScreen } from "~/app/fitScreen.tsx";
import { useChrome } from "~/app/useChrome.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { lessonOf, recordLesson } from "~/stats/history.ts";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { type TrainerResult, useTrainer } from "~/typing/useTrainer.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PRIMARY_BUTTON } from "~/ui/styles.ts";
import { Hud, type LastLesson } from "./Hud.tsx";
import { focusRung } from "./ladder.ts";
import { buildPracticeLesson } from "./lesson.ts";
import { applyPracticeLesson } from "./outcome.ts";
import { loadWords, type PracticeWord } from "./words.ts";

function PracticeLesson({ words }: { words: readonly PracticeWord[] }) {
  const { profile, update } = useProfile();
  const { settings, stats } = profile;
  const textOnly = useChrome().chrome === "text-only";
  const { unlocked } = profile.ladder;
  const [seed, setSeed] = useState(Date.now);
  const [last, setLast] = useState<LastLesson | null>(null);
  const [unlockedAll, setUnlockedAll] = useState(0);

  const prompt = useMemo(
    () => buildPracticeLesson({ words, progress: { unlocked }, vocalization: settings.vocalization, seed }),
    [words, unlocked, settings.vocalization, seed],
  );

  const finish = useCallback(
    ({ metrics, samples }: TrainerResult) => {
      const next = update((current) => {
        const result = applyPracticeLesson({ stats: current.stats.practice, progress: current.ladder }, samples);
        return {
          ...current,
          ladder: result.progress,
          stats: { ...current.stats, practice: result.stats },
          history: recordLesson(current.history, lessonOf("practice", metrics, Date.now())),
        };
      });
      setLast({ metrics, unlocked: next.ladder.unlocked > unlocked ? focusRung(next.ladder) : undefined });
      setSeed(Date.now());
    },
    [update, unlocked],
  );

  const noPractice = Object.keys(stats.practice).length === 0;
  const trainer = useTrainer({ prompt, options: { requireBackspace: settings.requireBackspace }, onComplete: finish });
  const { focus } = trainer;

  useEffect(() => {
    if (last !== null || unlockedAll > 0) {
      focus();
    }
  }, [last, unlockedAll, focus]);

  return (
    <>
      <Hud
        progress={{ unlocked }}
        stats={stats.practice}
        vocalization={settings.vocalization}
        last={noPractice ? null : last}
        hidden={textOnly}
        onUnlocked={() => setUnlockedAll((count) => count + 1)}
      />
      <TypingSurface trainer={trainer} settings={settings} />
    </>
  );
}

export function PracticePage() {
  useFitScreen();
  const { chrome } = useChrome();
  const { t } = useI18n();
  const [words, setWords] = useState<readonly PracticeWord[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadWords().then(setWords, () => setFailed(true));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={chrome === "full" ? undefined : "sr-only"}>
        <PageHeading>{t("nav.practice")}</PageHeading>
        <p className="text-sm text-muted">{t("practice.subtitle")}</p>
        <p role="status" className="text-sm text-muted empty:hidden">
          {words === null && !failed ? t("practice.loading") : ""}
        </p>
      </div>
      {words !== null && <PracticeLesson words={words} />}
      {failed && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm font-medium">
            {t("practice.loadFailed")}
          </p>
          <button type="button" onClick={() => window.location.reload()} className={PRIMARY_BUTTON}>
            {t("action.reload")}
          </button>
        </div>
      )}
    </div>
  );
}
