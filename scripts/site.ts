import type { Plugin } from "vite";

export const DEFAULT_SITE_URL = "https://mafatih.tasrif.xyz/";

const AUDIO_ORIGIN = "https://everyayah.com";
const CHARSET = '<meta charset="UTF-8" />';
const PLACEHOLDER = "%SITE_URL%";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "media-src 'self' blob:",
  `connect-src 'self' ${AUDIO_ORIGIN}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join("; ");

export function siteUrlFrom(value: string | undefined): string {
  if (value === undefined || value === "") {
    return DEFAULT_SITE_URL;
  }
  const url = URL.parse(value);
  const plain =
    url !== null &&
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.username === "" &&
    url.password === "" &&
    url.search === "" &&
    url.hash === "";
  if (!plain) {
    throw new Error(`SITE_URL must be a plain http or https address without credentials, query or fragment: ${value}`);
  }
  return `${url.origin}${url.pathname.replace(/\/*$/, "/")}`;
}

export function withSiteUrl(html: string, siteUrl: string): string {
  return html.replaceAll(PLACEHOLDER, siteUrl);
}

export function withContentSecurityPolicy(html: string): string {
  return html.replace(
    CHARSET,
    `${CHARSET}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`,
  );
}

export function robotsTxt(siteUrl: string): string {
  return ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}sitemap.xml`, ""].join("\n");
}

export function sitemapXml(siteUrl: string, day: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    "  <url>",
    `    <loc>${siteUrl}</loc>`,
    `    <lastmod>${day}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>1.0</priority>",
    "  </url>",
    "</urlset>",
    "",
  ].join("\n");
}

export function seo(siteUrl: string): Plugin {
  const files = [
    { name: "robots.txt", type: "text/plain", source: robotsTxt(siteUrl) },
    {
      name: "sitemap.xml",
      type: "application/xml",
      source: sitemapXml(siteUrl, new Date().toISOString().slice(0, 10)),
    },
  ];
  return {
    name: "mafatih:seo",
    transformIndexHtml: (html) => withSiteUrl(html, siteUrl),
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const path = request.url?.split("?")[0] ?? "";
        const file = files.find(({ name }) => path.endsWith(`/${name}`));
        if (file === undefined) {
          next();
          return;
        }
        response.setHeader("Content-Type", file.type);
        response.end(file.source);
      });
    },
    generateBundle() {
      for (const { name, source } of files) {
        this.emitFile({ type: "asset", fileName: name, source });
      }
    },
  };
}

export function contentSecurityPolicy(): Plugin {
  return { name: "mafatih:csp", apply: "build", transformIndexHtml: withContentSecurityPolicy };
}
