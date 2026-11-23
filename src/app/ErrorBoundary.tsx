import { Component, type ReactNode, useEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { eraseStoredProfile } from "~/storage/ProfileProvider.tsx";
import { ConfirmDialog } from "~/ui/ConfirmDialog.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { BUTTON, PRIMARY_BUTTON } from "~/ui/styles.ts";

function reload(): void {
  window.location.reload();
}

function ErrorScreen() {
  const { t } = useI18n();
  const [asking, setAsking] = useState(false);
  const screen = useRef<HTMLElement>(null);

  useEffect(() => {
    screen.current?.querySelector("h1")?.focus();
  }, []);

  const answer = (erase: boolean) => {
    if (erase) {
      eraseStoredProfile();
      reload();
      return;
    }
    setAsking(false);
  };

  return (
    <main ref={screen} className="mx-auto flex max-w-prose flex-col items-start gap-4 p-4">
      <PageHeading>{t("error.title")}</PageHeading>
      <p role="alert">{t("error.body")}</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reload} className={PRIMARY_BUTTON}>
          {t("action.reload")}
        </button>
        <button type="button" onClick={() => setAsking(true)} className={BUTTON}>
          {t("error.startOver")}
        </button>
      </div>
      <ConfirmDialog
        danger
        open={asking}
        question={t("error.question")}
        warning={t("error.warning")}
        keepLabel={t("settings.keepProgress")}
        confirmLabel={t("error.erase")}
        onAnswer={answer}
      />
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
