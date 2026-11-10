import { useState } from "react";
import { I18nProvider } from "~/i18n/I18nProvider.tsx";
import { detectLanguage } from "~/i18n/i18n.ts";
import { Shell } from "./Shell.tsx";
import { useRoute } from "./useRoute.ts";

export function App() {
  const route = useRoute();
  const [language] = useState(() => detectLanguage(navigator.languages));
  return (
    <I18nProvider language={language}>
      <Shell page={route.page} />
    </I18nProvider>
  );
}
