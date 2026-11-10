import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePath = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base: basePath.endsWith("/") ? basePath : `${basePath}/`,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "~generated": fileURLToPath(new URL("./generated", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173, strictPort: true },
});
