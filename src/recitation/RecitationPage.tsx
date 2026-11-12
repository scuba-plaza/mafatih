import { useEffect, useId, useMemo } from "react";
import type { RecitationRoute } from "~/app/routes.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { isComplete, metricsOf } from "~/typing/session.ts";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { useTrainer } from "~/typing/useTrainer.ts";
import { LessonSummary } from "~/ui/LessonSummary.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { BUTTON, PRIMARY_BUTTON } from "~/ui/styles.ts";
import type { Passage } from "./passage.ts";
import { type Recitation, useRecitation } from "./useRecitation.ts";

interface PassageLessonProps {
  readonly passage: Passage;
  readonly recitation: Recitation;
  readonly describedBy: string;
}

function PassageLesson({ passage, recitation, describedBy }: PassageLessonProps) {
  const { t } = useI18n();
  const { settings } = useProfile().profile;
  const checkpoints = useMemo(() => passage.ayat.map((ayah) => ayah.lastUnit), [passage]);
  const signs = useMemo(() => passage.ayat.map((ayah) => ayah.sign), [passage]);
  const trainer = useTrainer({
    prompt: passage.prompt,
    options: { requireBackspace: settings.requireBackspace },
    onComplete: recitation.recordPassage,
    checkpoints,
    onCheckpoint: recitation.recordAyah,
  });
  const { focus, session } = trainer;
  const { continues } = recitation;

  useEffect(() => {
    if (continues) {
      focus();
    }
  }, [continues, focus]);

  return (
    <>
      <TypingSurface
        trainer={trainer}
        settings={settings}
        centredOpening={passage.basmala !== null}
        apparatus={signs}
        describedBy={describedBy}
      />
      {isComplete(session) && (
        <LessonSummary metrics={metricsOf(session)}>
          <button type="button" onClick={recitation.next} className={PRIMARY_BUTTON}>
            {t("recitation.next")}
          </button>
          <button type="button" onClick={trainer.restart} className={BUTTON}>
            {t("result.again")}
          </button>
        </LessonSummary>
      )}
    </>
  );
}

export function RecitationPage({ route }: { route: RecitationRoute }) {
  const { t, language } = useI18n();
  const recitation = useRecitation(route);
  const { meta, from, to, passage, failed } = recitation;
  const passageId = useId();

  return (
    <div className="flex flex-col gap-3">
      <div id={passageId}>
        <PageHeading>
          {language === "ar" ? (
            meta.name
          ) : (
            <>
              {meta.tname}{" "}
              <span lang="ar" dir="rtl" className="font-normal">
                {meta.name}
              </span>
            </>
          )}
        </PageHeading>
        <p className="text-sm text-muted">
          {t(from === to ? "recitation.ayah" : "recitation.ayat", { from, to, count: meta.ayat })}
        </p>
        <p role="status" className="text-sm text-muted">
          {passage === null && !failed ? t("recitation.loading") : ""}
        </p>
      </div>
      {passage !== null && (
        <PassageLesson
          key={`${passage.surah}:${passage.fromAyah}`}
          passage={passage}
          recitation={recitation}
          describedBy={passageId}
        />
      )}
      {failed && (
        <div className="flex flex-col items-start gap-3">
          <p role="alert" className="text-sm font-medium">
            {t("recitation.loadFailed")}
          </p>
          <button type="button" onClick={() => window.location.reload()} className={PRIMARY_BUTTON}>
            {t("recitation.reload")}
          </button>
        </div>
      )}
    </div>
  );
}
