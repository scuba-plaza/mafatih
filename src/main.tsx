import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "~/app/App.tsx";
import { trackInputModality } from "~/app/inputModality.ts";
import "~/styles/globals.css";

trackInputModality();

const root = document.getElementById("root");
if (root === null) {
  throw new Error("missing #root");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
