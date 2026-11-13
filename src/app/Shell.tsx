import { type ReactNode, useEffect, useRef } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { TOUCH_TARGET } from "~/ui/styles.ts";
import { PAGE_TITLES, type Page } from "./pages.ts";
import { formatRoute, type Route } from "./routes.ts";

const WORDMARK = "مفاتيح";

const PAGES: readonly Route[] = [
  { page: "recitation", surah: null, ayah: null },
  { page: "practice" },
  { page: "custom" },
  { page: "stats" },
];

const GUTTER =
  "pl-[max(1.25rem,env(safe-area-inset-left))] pr-[max(1.25rem,env(safe-area-inset-right))] md:pl-[max(2.25rem,env(safe-area-inset-left))] md:pr-[max(2.25rem,env(safe-area-inset-right))]";
const COLUMN = "mx-auto w-full max-w-4xl";
const TOP_LINK = `${TOUCH_TARGET} border-b-2 border-transparent px-3 text-sm text-muted aria-[current=page]:border-accent aria-[current=page]:text-ink`;
const TAB_LINK =
  "relative flex min-h-16 min-w-0 flex-1 items-center justify-center px-1 text-center text-sm leading-tight wrap-anywhere text-muted after:absolute after:bottom-2.5 after:h-0.5 after:w-5 after:rounded-full after:bg-transparent aria-[current=page]:text-ink aria-[current=page]:after:bg-accent";

interface NavProps {
  readonly page: Page;
  readonly label: string;
  readonly linkClass: string;
  readonly title: (page: Page) => string;
}

function PageLinks({ page, linkClass, title }: Omit<NavProps, "label">) {
  return PAGES.map((route) => (
    <li key={route.page} className="flex flex-1 md:flex-none">
      <a
        href={formatRoute(route)}
        aria-current={route.page === page ? "page" : undefined}
        className={`${linkClass} flex-1`}
      >
        {title(route.page)}
      </a>
    </li>
  ));
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
  const title = (target: Page) => t(PAGE_TITLES[target]);
  const appName = t("app.name");
  const navLabel = t("nav.label");

  useEffect(() => {
    document.title = `${t(PAGE_TITLES[page])} · ${appName}`;
  }, [page, appName, t]);

  useEffect(() => {
    if (shownPage.current !== page) {
      shownPage.current = page;
      window.scrollTo(0, 0);
      mainRef.current?.querySelector("h1")?.focus();
    }
  }, [page]);

  return (
    <div className="grid min-h-dvh grid-cols-1 grid-rows-[auto_auto_1fr]">
      <header className={`${GUTTER} pt-[env(safe-area-inset-top)]`}>
        <button
          type="button"
          onClick={() => mainRef.current?.focus()}
          className="sr-only focus:not-sr-only focus:flex focus:min-h-11 focus:w-full focus:items-center focus:px-4 focus:font-medium focus:underline"
        >
          {t("app.skipToContent")}
        </button>
        <div className="flex min-h-16 items-center justify-between gap-4">
          <span role="img" lang="ar" aria-label={appName} className="text-xl text-muted">
            {WORDMARK}
          </span>
          <div className="flex items-center gap-1">
            <nav aria-label={navLabel} className="hidden md:block">
              <ul className="flex gap-1">
                <PageLinks page={page} linkClass={TOP_LINK} title={title} />
              </ul>
            </nav>
            {actions}
          </div>
        </div>
      </header>
      <div className={GUTTER}>
        <div className={COLUMN}>{banner}</div>
      </div>
      <main
        ref={mainRef}
        tabIndex={-1}
        className={`${GUTTER} flex flex-col pt-2 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-8`}
      >
        <div className={`${COLUMN} flex flex-1 flex-col`}>{children}</div>
      </main>
      <nav
        aria-label={navLabel}
        data-tabbar=""
        className="fixed inset-x-0 bottom-0 z-20 border-t border-faint bg-page pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] md:hidden"
      >
        <ul className="flex">
          <PageLinks page={page} linkClass={TAB_LINK} title={title} />
        </ul>
      </nav>
    </div>
  );
}
