import { existsSync, readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  CONTENT_SECURITY_POLICY,
  DEFAULT_SITE_URL,
  robotsTxt,
  sitemapXml,
  siteUrlFrom,
  withContentSecurityPolicy,
  withSiteUrl,
} from "./site.ts";

const INDEX = readFileSync("index.html", "utf8");
const MANIFEST: unknown = JSON.parse(readFileSync("public/site.webmanifest", "utf8"));

test("the policy allows the page's own files, played audio only from blob URLs, and fetches only from EveryAyah", () => {
  expect(CONTENT_SECURITY_POLICY.split("; ")).toEqual([
    "default-src 'self'",
    "script-src 'self'",
    "media-src 'self' blob:",
    "connect-src 'self' https://everyayah.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ]);
});

test("the policy goes into the page right after the charset, with a strict referrer policy", () => {
  const html = withContentSecurityPolicy('<head>\n<meta charset="UTF-8" />\n<title>x</title>');
  expect(html).toContain(
    `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
  );
  expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin" />');
  expect(html.indexOf("charset")).toBeLessThan(html.indexOf("Content-Security-Policy"));
});

test("the site address always ends in one slash and falls back to the default", () => {
  expect(siteUrlFrom(undefined)).toBe(DEFAULT_SITE_URL);
  expect(siteUrlFrom("")).toBe(DEFAULT_SITE_URL);
  expect(siteUrlFrom("https://example.test")).toBe("https://example.test/");
  expect(siteUrlFrom("https://example.test/app///")).toBe("https://example.test/app/");
});

test("the site address is checked: a plain http or https address, with nothing that could break the page", () => {
  expect(siteUrlFrom("HTTP://Example.test/App")).toBe("http://example.test/App/");
  expect(siteUrlFrom('https://example.test/a"b<c')).toBe("https://example.test/a%22b%3Cc/");
  for (const wrong of [
    "javascript:alert(1)",
    "ftp://example.test/",
    "example.test",
    "https://user:secret@example.test/",
    "https://example.test/?a=1",
    "https://example.test/#top",
  ]) {
    expect(() => siteUrlFrom(wrong), wrong).toThrow(/SITE_URL/);
  }
});

test("every placeholder of the site address in the page is replaced", () => {
  expect(withSiteUrl('<a href="%SITE_URL%x"></a><b>%SITE_URL%</b>', "https://example.test/")).toBe(
    '<a href="https://example.test/x"></a><b>https://example.test/</b>',
  );
});

test("robots.txt allows everything and points to the sitemap of the site", () => {
  expect(robotsTxt("https://example.test/")).toBe(
    "User-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n",
  );
});

test("the sitemap lists the site's one address with the day it was built", () => {
  const xml = sitemapXml("https://example.test/", "2026-11-12");
  expect(xml).toContain("<loc>https://example.test/</loc>");
  expect(xml).toContain("<lastmod>2026-11-12</lastmod>");
  expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
});

test("the page's viewport is the mobile contract's: it never disables zoom", () => {
  const viewport = INDEX.match(/<meta\s+name="viewport"\s+content="([^"]*)"/)?.[1];
  expect(viewport).toBe("width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content");
});

test("the page says what the site is: title, description, address, previews and structured data", () => {
  expect(INDEX).toMatch(/<title>[^<]*Mafatih[^<]*<\/title>/);
  expect(INDEX).toMatch(/<meta\s+name="description"\s+content="[^"]{60,}"/);
  expect(INDEX).toContain('<link rel="canonical" href="%SITE_URL%" />');
  expect(INDEX).toContain('<meta property="og:image" content="%SITE_URL%og-image.png" />');
  expect(INDEX).toContain('<meta name="twitter:card" content="summary_large_image" />');
  expect(INDEX).toContain('<link rel="manifest" href="/site.webmanifest" />');
  expect(INDEX).toContain('<link rel="apple-touch-icon" href="/apple-touch-icon.png" />');
  expect(INDEX).toContain('"@type": "WebApplication"');
});

test("the page holds no script of its own except the data block and the entry module", () => {
  const scripts = [...INDEX.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1]?.trim());
  expect(scripts).toEqual(['type="application/ld+json"', 'type="module" src="/src/main.tsx"']);
});

test("every file the page and the manifest point to exists in public", () => {
  const references = [...INDEX.matchAll(/(?:href|content)="(\/[^"]+\.(?:ico|svg|png|webmanifest))"/g)].map(
    (match) => match[1] ?? "",
  );
  expect(references.length).toBeGreaterThanOrEqual(4);
  for (const reference of references) {
    expect(existsSync(`public${reference}`), reference).toBe(true);
  }
  expect(existsSync("public/og-image.png")).toBe(true);
  const manifest = MANIFEST as { icons?: { src: string }[] };
  expect(manifest.icons?.length).toBeGreaterThanOrEqual(3);
  for (const icon of manifest.icons ?? []) {
    expect(existsSync(`public/${icon.src}`), icon.src).toBe(true);
  }
});

test("the manifest names the app, describes it and opens it from its own folder", () => {
  expect(MANIFEST).toMatchObject({
    short_name: "Mafatih",
    start_url: "./",
    scope: "./",
    display: "standalone",
  });
  expect(typeof (MANIFEST as { description?: unknown }).description).toBe("string");
});
