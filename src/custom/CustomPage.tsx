import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { useProfile } from "~/storage/ProfileProvider.tsx";
import { buildPrompt, type Prompt } from "~/text/prompt.ts";
import { requiredMarks } from "~/text/vocalization.ts";
import { TypingSurface } from "~/typing/TypingSurface.tsx";
import { type TrainerResult, useTrainer } from "~/typing/useTrainer.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { CUSTOM_TEXT_LIMIT, hasSomethingToType, prepareCustomText } from "./text.ts";

const NO_MARKS_UNLOCKED: ReadonlySet<string> = new Set();
const BUTTON = "min-h-11 rounded-md border border-line bg-surface px-4 text-sm font-medium";
const PRIMARY_BUTTON = "min-h-11 rounded-md bg-accent px-4 text-sm font-medium text-on-accent";

interface TextFormProps {
  readonly initial: string;
  readonly focusField: boolean;
  readonly toPrompt: (text: string) => Prompt;
  readonly onStart: (text: string, shortened: boolean) => void;
}

function TextForm({ initial, focusField, toPrompt, onStart }: TextFormProps) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(initial);
  const [invalid, setInvalid] = useState(false);
  const field = useRef<HTMLTextAreaElement>(null);
  const fieldId = useId();
  const hintId = useId();
  const errorId = useId();

  useEffect(() => {
    if (focusField) {
      field.current?.focus();
    }
  }, [focusField]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const prepared = prepareCustomText(draft);
    if (!hasSomethingToType(toPrompt(prepared.text))) {
      setInvalid(true);
      field.current?.focus();
      return;
    }
    onStart(prepared.text, prepared.truncated);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <label htmlFor={fieldId} className="text-sm font-medium">
        {t("typing.text")}
      </label>
      <textarea
        ref={field}
        id={fieldId}
        value={draft}
        onChange={(event) => {
          setDraft(event.target.value);
          setInvalid(false);
        }}
        aria-describedby={invalid ? `${hintId} ${errorId}` : hintId}
        aria-invalid={invalid ? true : undefined}
        lang="ar"
        dir="auto"
        rows={6}
        className="rounded-md border border-line bg-surface p-3 text-lg leading-loose aria-invalid:border-danger"
      />
      <p id={hintId} className="text-sm text-muted">
        {t("custom.textHint")}
      </p>
      {invalid && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {t("custom.nothingToType")}
        </p>
      )}
      <div>
        <button type="submit" className={PRIMARY_BUTTON}>
          {t("typing.start")}
        </button>
      </div>
    </form>
  );
}

interface LessonProps {
  readonly prompt: Prompt;
  readonly startNow: boolean;
  readonly shortened: boolean;
  readonly onEdit: () => void;
}

function Lesson({ prompt, startNow, shortened, onEdit }: LessonProps) {
  const { t, formatNumber, formatPercent } = useI18n();
  const { settings } = useProfile().profile;
  const [result, setResult] = useState<TrainerResult | null>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const figuresId = useId();
  const trainer = useTrainer({
    prompt,
    options: { requireBackspace: settings.requireBackspace },
    onComplete: setResult,
  });
  const { focus } = trainer;

  useEffect(() => {
    if (startNow) {
      focus();
    }
  }, [startNow, focus]);

  useEffect(() => {
    if (result !== null) {
      summaryHeading.current?.focus();
    }
  }, [result]);

  return (
    <div className="flex flex-col gap-3">
      {shortened && <p className="text-sm text-muted">{t("custom.shortened", { limit: CUSTOM_TEXT_LIMIT })}</p>}
      <TypingSurface trainer={trainer} font={settings.font} fontSize={settings.fontSize} />
      {result === null ? (
        <div>
          <button type="button" onClick={onEdit} className={BUTTON}>
            {t("custom.edit")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <h2 ref={summaryHeading} tabIndex={-1} aria-describedby={figuresId} className="text-lg font-semibold">
            {t("result.title")}
          </h2>
          <dl id={figuresId} className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 text-sm">
            <dt className="text-muted">{t("result.speed")}</dt>
            <dd>{formatNumber(result.metrics.cpm)}</dd>
            <dt className="text-muted">{t("result.accuracy")}</dt>
            <dd>{formatPercent(result.metrics.accuracy)}</dd>
            <dt className="text-muted">{t("result.mistakes")}</dt>
            <dd>{formatNumber(result.metrics.errors)}</dd>
          </dl>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setResult(null);
                trainer.restart();
              }}
              className={PRIMARY_BUTTON}
            >
              {t("result.again")}
            </button>
            <button type="button" onClick={onEdit} className={BUTTON}>
              {t("custom.edit")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CustomPage() {
  const { t } = useI18n();
  const { profile, update } = useProfile();
  const { customText, vocalization } = profile.settings;
  const [text, setText] = useState(customText);
  const [mode, setMode] = useState<"saved" | "editing" | "started">("saved");
  const [shortened, setShortened] = useState(false);
  const required = useMemo(() => requiredMarks(vocalization, NO_MARKS_UNLOCKED), [vocalization]);
  const prompt = useMemo(() => buildPrompt(text, required), [text, required]);
  const editing = mode === "editing" || !hasSomethingToType(prompt);

  return (
    <div className="flex flex-col gap-3">
      <PageHeading>{t("nav.custom")}</PageHeading>
      {editing ? (
        <TextForm
          initial={customText}
          focusField={mode === "editing"}
          toPrompt={(draft) => buildPrompt(draft, required)}
          onStart={(prepared, wasShortened) => {
            update((current) => ({ ...current, settings: { ...current.settings, customText: prepared } }));
            setText(prepared);
            setShortened(wasShortened);
            setMode("started");
          }}
        />
      ) : (
        <Lesson prompt={prompt} startNow={mode === "started"} shortened={shortened} onEdit={() => setMode("editing")} />
      )}
    </div>
  );
}
