import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const basePath = process.env.BASE_PATH ?? "/";

const CORPUS_MODULE = /generated[\\/]corpus\.json/;

function corpusChunk(): Plugin {
  return {
    name: "mafatih:corpus-chunk",
    config(config) {
      if (config.build?.lib !== undefined) {
        return undefined;
      }
      return {
        build: {
          rolldownOptions: {
            output: {
              codeSplitting: { groups: [{ name: "corpus", test: CORPUS_MODULE }] },
            },
          },
        },
      };
    },
  };
}

export default defineConfig({
  base: basePath.endsWith("/") ? basePath : `${basePath}/`,
  plugins: [react(), tailwindcss(), corpusChunk()],
  resolve: {
    alias: {
      "~generated": fileURLToPath(new URL("./generated", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173 },
});
