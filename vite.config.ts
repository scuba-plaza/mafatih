import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { contentSecurityPolicy, seo, siteUrlFrom } from "./scripts/site.ts";

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath.endsWith("/") ? basePath : `${basePath}/`,
  plugins: [react(), tailwindcss(), seo(siteUrlFrom(process.env.SITE_URL)), contentSecurityPolicy()],
  resolve: { alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) } },
  server: { port: 5173, strictPort: true },
  test: { include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"], environment: "node" },
});
