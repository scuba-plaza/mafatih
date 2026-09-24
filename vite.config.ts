import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const basePath = process.env.BASE_PATH ?? "/";

const DEFAULT_SITE_URL = "https://scuba-plaza.github.io/mafatih/";

const siteUrl = (process.env.SITE_URL || DEFAULT_SITE_URL).replace(/\/*$/, "/");

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

function seo(): Plugin {
  const lastmod = new Date().toISOString().slice(0, 10);
  const robots = ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}sitemap.xml`, ""].join("\n");
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${siteUrl}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");

  return {
    name: "mafatih:seo",
    transformIndexHtml(html) {
      return html.replaceAll("%SITE_URL%", siteUrl);
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0] ?? "";
        const body = path.endsWith("/robots.txt") ? robots : path.endsWith("/sitemap.xml") ? sitemap : null;
        if (body === null) {
          next();
          return;
        }
        res.setHeader("Content-Type", path.endsWith(".txt") ? "text/plain" : "application/xml");
        res.end(body);
      });
    },
    generateBundle() {
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robots });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemap });
    },
  };
}

export default defineConfig({
  base: basePath.endsWith("/") ? basePath : `${basePath}/`,
  plugins: [react(), tailwindcss(), corpusChunk(), seo()],
  resolve: {
    alias: {
      "~generated": fileURLToPath(new URL("./generated", import.meta.url)),
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: { port: 5173 },
});
