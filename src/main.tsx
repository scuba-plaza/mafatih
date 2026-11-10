import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "~/styles/globals.css";

const root = document.getElementById("root");
if (root === null) {
  throw new Error("missing #root");
}

createRoot(root).render(
  <StrictMode>
    <main>
      <h1>Mafatih</h1>
    </main>
  </StrictMode>,
);
