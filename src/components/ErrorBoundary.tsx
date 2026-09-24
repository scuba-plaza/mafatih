import { Component, type ReactNode } from "react";
import { PRIMARY_BUTTON } from "~/components/ui.ts";
import { STORAGE_KEY } from "~/storage/profile.ts";

export interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

function reload(): void {
  window.location.reload();
}

function resetAndReload(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    reload();
    return;
  }
  reload();
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  render(): ReactNode {
    if (!this.state.failed) {
      return this.props.children;
    }
    return (
      <main
        data-cy="crash"
        role="alert"
        className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 text-center"
      >
        <span lang="ar" className="font-arabic text-3xl text-stone-900 dark:text-stone-100">
          مفاتيح
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-sm font-medium text-stone-800 dark:text-stone-200">Something went wrong.</h1>
          <p className="text-sm text-stone-500">
            Reloading usually fixes it. If it keeps happening, starting over clears the progress saved in this browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button type="button" data-cy="crash-reload" onClick={reload} className={`${PRIMARY_BUTTON} py-2`}>
            Reload
          </button>
          <button
            type="button"
            data-cy="crash-reset"
            onClick={resetAndReload}
            className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400"
          >
            Start over
          </button>
        </div>
      </main>
    );
  }
}
