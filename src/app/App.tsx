import { CustomPage } from "~/custom/CustomPage.tsx";
import { I18nProvider } from "~/i18n/I18nProvider.tsx";
import type { Language } from "~/i18n/i18n.ts";
import { PracticePage } from "~/practice/PracticePage.tsx";
import { RecitationPage } from "~/recitation/RecitationPage.tsx";
import { SettingsButton } from "~/settings/SettingsButton.tsx";
import { StatsPage } from "~/stats/StatsPage.tsx";
import { ProfileProvider, useProfile } from "~/storage/ProfileProvider.tsx";
import { StorageNotice } from "~/storage/StorageNotice.tsx";
import { AboutPage } from "./AboutPage.tsx";
import { ErrorBoundary } from "./ErrorBoundary.tsx";
import type { Route } from "./routes.ts";
import { Shell } from "./Shell.tsx";
import { useRoute } from "./useRoute.ts";

function PageContent({ route }: { route: Route }) {
  switch (route.page) {
    case "recitation":
      return <RecitationPage route={route} />;
    case "custom":
      return <CustomPage />;
    case "practice":
      return <PracticePage />;
    case "stats":
      return <StatsPage />;
    case "about":
      return <AboutPage />;
  }
}

function viewOf(route: Route): string {
  return route.page === "recitation" && route.surah !== null ? "lesson" : route.page;
}

function Pages() {
  const route = useRoute();
  const { profile } = useProfile();
  return (
    <I18nProvider language={profile.settings.language}>
      <ErrorBoundary>
        <Shell page={route.page} view={viewOf(route)} banner={<StorageNotice />} actions={<SettingsButton />}>
          <PageContent route={route} />
        </Shell>
      </ErrorBoundary>
    </I18nProvider>
  );
}

export function App({ requestedLanguage = null }: { requestedLanguage?: Language | null }) {
  return (
    <ProfileProvider requestedLanguage={requestedLanguage}>
      <Pages />
    </ProfileProvider>
  );
}
