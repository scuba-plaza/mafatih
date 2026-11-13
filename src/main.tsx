import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "~/app/App.tsx";
import { takeLanguageFromAddress } from "~/app/languageLink.ts";
import "@fontsource/noto-naskh-arabic/arabic-400.css";
import "@fontsource/noto-naskh-arabic/arabic-600.css";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("missing #root");
}

const requestedLanguage = takeLanguageFromAddress(window.location, window.history);

createRoot(root).render(
  <StrictMode>
    <App requestedLanguage={requestedLanguage} />
  </StrictMode>,
);
