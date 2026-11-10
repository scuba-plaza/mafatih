import { type ReactNode, useEffect, useRef } from "react";
import type { MessageKey } from "~/i18n/en.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { formatRoute, type Route } from "./routes.ts";

type Page = Route["page"];

const TITLES: Record<Page, MessageKey> = {
  recitation: "nav.recitation",
  practice: "nav.practice",
  custom: "nav.custom",
  stats: "nav.stats",
  about: "nav.about",
};

const MODES: readonly Route[] = [
  { page: "recitation", surah: null, ayah: null },
  { page: "practice" },
  { page: "custom" },
];

const STATS: Route = { page: "stats" };
const ABOUT: Route = { page: "about" };

const TARGET = "inline-flex min-h-11 min-w-11 items-center justify-center px-2";
const GUTTER = "ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))]";
const COLUMN = "mx-auto w-full max-w-4xl";
const NAV_LINK = `${TARGET} border-b-2 border-transparent text-sm text-muted aria-[current=page]:border-accent aria-[current=page]:font-semibold aria-[current=page]:text-ink`;

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

export function Shell({ page, children }: { page: Page; children?: ReactNode }) {
  const { t } = useI18n();
  const mainRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const shownPage = useRef(page);
  const title = t(TITLES[page]);
  const appName = t("app.name");

  useEffect(() => {
    document.title = `${title} · ${appName}`;
  }, [title, appName]);

  useEffect(() => {
    if (shownPage.current !== page) {
      shownPage.current = page;
      headingRef.current?.focus();
    }
  }, [page]);

  return (
    <div className="grid min-h-dvh grid-rows-[auto_1fr_auto]">
      <button
        type="button"
        onClick={() => mainRef.current?.focus()}
        className={`${TARGET} sr-only rounded-md bg-surface text-ink focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-10`}
      >
        {t("app.skipToContent")}
      </button>
      <header className={`${GUTTER} border-b border-line pt-[env(safe-area-inset-top)]`}>
        <div className={`${COLUMN} flex items-center gap-2`}>
          <span className="hidden font-semibold sm:inline">{appName}</span>
          <nav aria-label={t("nav.label")} className="flex flex-1 items-center sm:justify-end sm:gap-2">
            {MODES.map((mode) => (
              <span key={mode.page} className="flex flex-1 justify-center sm:flex-none">
                <NavLink to={mode} current={page}>
                  {t(TITLES[mode.page])}
                </NavLink>
              </span>
            ))}
            <NavLink to={STATS} current={page}>
              <StatsIcon />
              <span className="sr-only sm:not-sr-only">{t("nav.stats")}</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main ref={mainRef} id="main" tabIndex={-1} className={`${GUTTER} py-4`}>
        <div className={COLUMN}>
          <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold">
            {title}
          </h1>
          {children}
        </div>
      </main>
      <footer className={`${GUTTER} border-t border-line pb-[env(safe-area-inset-bottom)]`}>
        <div className={`${COLUMN} flex items-center justify-between text-sm text-muted`}>
          <span>{appName}</span>
          <a
            href={formatRoute(ABOUT)}
            aria-current={page === "about" ? "page" : undefined}
            className={`${TARGET} underline`}
          >
            {t("nav.about")}
          </a>
        </div>
      </footer>
    </div>
  );
}
