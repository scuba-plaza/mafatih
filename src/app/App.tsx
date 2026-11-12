import { CustomPage } from "~/custom/CustomPage.tsx";
import { I18nProvider, useI18n } from "~/i18n/I18nProvider.tsx";
import { PracticePage } from "~/practice/PracticePage.tsx";
import { RecitationPage } from "~/recitation/RecitationPage.tsx";
import { SettingsButton } from "~/settings/SettingsButton.tsx";
import { StatsPage } from "~/stats/StatsPage.tsx";
import { ProfileProvider, useProfile } from "~/storage/ProfileProvider.tsx";
import { StorageNotice } from "~/storage/StorageNotice.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PAGE_TITLES, type Page } from "./pages.ts";
import type { Route } from "./routes.ts";
import { Shell } from "./Shell.tsx";
import { useRoute } from "./useRoute.ts";

function Placeholder({ page }: { page: Page }) {
  const { t } = useI18n();
  return <PageHeading>{t(PAGE_TITLES[page])}</PageHeading>;
}

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
    default:
      return <Placeholder page={route.page} />;
  }
}

function Pages() {
  const route = useRoute();
  const { profile } = useProfile();
  return (
    <I18nProvider language={profile.settings.language}>
      <Shell page={route.page} banner={<StorageNotice />} actions={<SettingsButton />}>
        <PageContent route={route} />
      </Shell>
    </I18nProvider>
  );
}

export function App() {
  return (
    <ProfileProvider>
      <Pages />
    </ProfileProvider>
  );
}
