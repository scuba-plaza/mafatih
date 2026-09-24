import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "~/components/App.tsx";
import ErrorBoundary from "~/components/ErrorBoundary.tsx";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("missing #root");
}

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
