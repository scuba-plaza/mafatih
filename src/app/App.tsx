import { useState } from "react";
import { I18nProvider, useI18n } from "~/i18n/I18nProvider.tsx";
import { detectLanguage } from "~/i18n/i18n.ts";
import { PageHeading } from "~/ui/PageHeading.tsx";
import { PAGE_TITLES, type Page } from "./pages.ts";
import { Shell } from "./Shell.tsx";
import { useRoute } from "./useRoute.ts";

function Placeholder({ page }: { page: Page }) {
  const { t } = useI18n();
  return <PageHeading>{t(PAGE_TITLES[page])}</PageHeading>;
}

export function App() {
  const route = useRoute();
  const [language] = useState(() => detectLanguage(navigator.languages));
  return (
    <I18nProvider language={language}>
      <Shell page={route.page}>
        <Placeholder page={route.page} />
      </Shell>
    </I18nProvider>
  );
}
