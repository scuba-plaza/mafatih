import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { eraseStoredProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmChoice } from "~/ui/ConfirmChoice.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { BUTTON, PRIMARY_BUTTON } from "~/ui/styles.ts";

function reload(): void {
  window.location.reload();
}

function ErrorScreen() {
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!confirming && restoreFocus.current) {
      restoreFocus.current = false;
      opener.current?.focus();
    }
  }, [confirming]);

  const answer = (erase: boolean) => {
    if (erase) {
      eraseStoredProfile();
      reload();
      return;
    }
    restoreFocus.current = true;
    setConfirming(false);
  };

  return (
    <main className="mx-auto flex max-w-prose flex-col items-start gap-4 p-4">
      <PageHeading>{t("error.title")}</PageHeading>
      <p role="alert">{t("error.body")}</p>
      {confirming ? (
        <ConfirmChoice
          question={t("error.question")}
          warning={t("error.warning")}
          keepLabel={t("settings.keepProgress")}
          confirmLabel={t("error.erase")}
          onAnswer={answer}
        />
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={reload} className={PRIMARY_BUTTON}>
            {t("action.reload")}
          </button>
          <button type="button" ref={opener} onClick={() => setConfirming(true)} className={BUTTON}>
            {t("error.startOver")}
          </button>
        </div>
      )}
    </main>
  );
}

interface ErrorBoundaryState {
  readonly failed: boolean;
}

export class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    return this.state.failed ? <ErrorScreen /> : this.props.children;
  }
}
