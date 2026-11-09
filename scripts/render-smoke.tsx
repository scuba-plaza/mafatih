import { renderToString } from "react-dom/server";
import { App } from "../src/ui/App.tsx";

const html = renderToString(<App />);
const checks = [
  ["Recitation", html.includes("Recitation")],
  ["surah list", html.includes("Al-Faatiha")],
  ["practice corpus loaded", html.includes("Practice")],
  ["attribution", html.includes("Tanzil")],
] as const;

let failed = false;
for (const [name, ok] of checks) {
  if (!ok) {
    failed = true;
    console.error(`render smoke failed: ${name}`);
  }
}
if (failed) {
  process.exit(1);
}
console.log("render smoke passed");
