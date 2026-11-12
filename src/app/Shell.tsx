import { type ReactNode, useEffect, useRef } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { TOUCH_TARGET } from "~/ui/styles.ts";
import { PAGE_TITLES, type Page } from "./pages.ts";
import { formatRoute, type Route } from "./routes.ts";

const MODES: readonly Route[] = [
  { page: "recitation", surah: null, ayah: null },
  { page: "practice" },
  { page: "custom" },
];

const STATS: Route = { page: "stats" };
const ABOUT: Route = { page: "about" };

const GUTTER = "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]";
const COLUMN = "mx-auto w-full max-w-4xl";
const NAV_LINK = `${TOUCH_TARGET} flex-1 border-b-2 border-transparent text-sm font-medium text-muted aria-[current=page]:border-accent aria-[current=page]:text-ink`;

function NavLink({ to, current, children }: { to: Route; current: Page; children: ReactNode }) {
  return (
    <a href={formatRoute(to)} aria-current={to.page === current ? "page" : undefined} className={NAV_LINK}>
      {children}
    </a>
  );
}

function StatsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 sm:hidden" fill="currentColor">
      <rect x="4" y="12" width="4" height="8" rx="1" />
      <rect x="10" y="6" width="4" height="14" rx="1" />
      <rect x="16" y="9" width="4" height="11" rx="1" />
    </svg>
  );
}

interface ShellProps {
  readonly page: Page;
  readonly banner: ReactNode;
  readonly actions: ReactNode;
  readonly children: ReactNode;
}

export function Shell({ page, banner, actions, children }: ShellProps) {
  const { t } = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  const shownPage = useRef(page);
  const title = t(PAGE_TITLES[page]);
  const appName = t("app.name");

  useEffect(() => {
    document.title = `${title} · ${appName}`;
  }, [title, appName]);

  useEffect(() => {
    if (shownPage.current !== page) {
      shownPage.current = page;
      window.scrollTo(0, 0);
      mainRef.current?.querySelector("h1")?.focus();
    }
  }, [page]);

  return (
    <div className="grid min-h-dvh grid-rows-[auto_auto_1fr_auto]">
      <header className={`${GUTTER} border-b border-line pt-[env(safe-area-inset-top)]`}>
        <button
          type="button"
          onClick={() => mainRef.current?.focus()}
          className="sr-only focus:not-sr-only focus:flex focus:min-h-11 focus:w-full focus:items-center focus:px-4 focus:font-medium focus:underline"
        >
          {t("app.skipToContent")}
        </button>
        <div className={`${COLUMN} flex flex-wrap items-center gap-x-2`}>
          <span className="hidden font-semibold sm:inline">{appName}</span>
          <nav aria-label={t("nav.label")} className="min-w-0 flex-1">
            <ul className="flex flex-wrap sm:justify-end sm:gap-2">
              {MODES.map((mode) => (
                <li key={mode.page} className="flex flex-1 sm:flex-none">
                  <NavLink to={mode} current={page}>
                    {t(PAGE_TITLES[mode.page])}
                  </NavLink>
                </li>
              ))}
              <li className="flex">
                <NavLink to={STATS} current={page}>
                  <StatsIcon />
                  <span className="sr-only sm:not-sr-only">{t("nav.stats")}</span>
                </NavLink>
              </li>
            </ul>
          </nav>
          {actions}
        </div>
      </header>
      <div className={GUTTER}>
        <div className={COLUMN}>{banner}</div>
      </div>
      <main ref={mainRef} tabIndex={-1} className={`${GUTTER} py-4`}>
        <div className={COLUMN}>{children}</div>
      </main>
      <footer className={`${GUTTER} border-t border-line pb-[env(safe-area-inset-bottom)]`}>
        <div className={`${COLUMN} flex justify-end`}>
          <a
            href={formatRoute(ABOUT)}
            aria-current={page === "about" ? "page" : undefined}
            className={`${TOUCH_TARGET} text-sm text-muted underline aria-[current=page]:text-ink aria-[current=page]:decoration-2`}
          >
            {t("nav.about")}
          </a>
        </div>
      </footer>
    </div>
  );
}
