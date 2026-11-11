import { I18nProvider, useI18n } from "~/i18n/I18nProvider.tsx";
import { ProfileProvider, useProfile } from "~/storage/ProfileProvider.tsx";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PAGE_TITLES, type Page } from "./pages.ts";
import { Shell } from "./Shell.tsx";
import { useRoute } from "./useRoute.ts";

function Placeholder({ page }: { page: Page }) {
  const { t } = useI18n();
  return <PageHeading>{t(PAGE_TITLES[page])}</PageHeading>;
}

function Pages() {
  const route = useRoute();
  const { profile, notice } = useProfile();
  return (
    <I18nProvider language={profile.settings.language}>
      <Shell page={route.page} notice={notice}>
        <Placeholder page={route.page} />
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
