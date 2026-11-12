import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const CLIP = readFileSync(new URL("./fixtures/ayah.mp3", import.meta.url));

const POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "media-src 'self' blob: https://everyayah.com",
  "connect-src 'self' https://everyayah.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
];

async function builtPage(page: Page): Promise<string> {
  return (await page.request.get("/")).text();
}

test("the built page carries the content security policy, a strict referrer policy and no script of its own", async ({
  page,
}) => {
  const html = await builtPage(page);
  const policy = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
  expect(policy?.split("; ")).toEqual(POLICY);
  expect(html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin" />');
  const scripts = [...html.matchAll(/<script\b([^>]*)>/g)].map((match) => match[1] ?? "");
  expect(scripts.filter((attributes) => !/\bsrc="/.test(attributes))).toEqual([' type="application/ld+json"']);
  expect(html).not.toContain("%SITE_URL%");
  expect(html).toMatch(/<link rel="canonical" href="https?:\/\/[^"]+\/" \/>/);
});

test("robots.txt and sitemap.xml are served and point at each other", async ({ page }) => {
  const robots = await page.request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  const robotsText = await robots.text();
  expect(robotsText).toContain("User-agent: *");
  const sitemapUrl = robotsText.match(/^Sitemap: (.+)$/m)?.[1] ?? "";
  expect(sitemapUrl).toMatch(/\/sitemap\.xml$/);
  const sitemap = await page.request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toMatch(/<loc>https?:\/\/[^<]+\/<\/loc>/);
});

test("the manifest and every icon the page and the manifest name are served as images", async ({ page }) => {
  const html = await builtPage(page);
  const manifestResponse = await page.request.get("/site.webmanifest");
  expect(manifestResponse.status()).toBe(200);
  const manifest: { icons: { src: string }[]; description: string } = await manifestResponse.json();
  expect(manifest.description.length).toBeGreaterThan(10);
  const fromPage = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="([^"]+)"/g)].map(
    (match) => match[1] ?? "",
  );
  const fromManifest = manifest.icons.map((icon) => `/${icon.src}`);
  expect(fromPage.length).toBeGreaterThanOrEqual(3);
  for (const path of [...fromPage, ...fromManifest]) {
    const response = await page.request.get(path);
    expect(response.status(), path).toBe(200);
    expect(response.headers()["content-type"], path).toMatch(/^image\//);
  }
});

test("nothing the app does is blocked by the policy: every page, the fonts, audio and a download", async ({ page }) => {
  await page.addInitScript(() => {
    const seen: string[] = [];
    Object.assign(window, { policyViolations: seen });
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.route("https://everyayah.com/**", (route) =>
    route.fulfill({ body: CLIP, contentType: "audio/mpeg", headers: { "access-control-allow-origin": "*" } }),
  );
  for (const hash of ["#/", "#/recitation/1", "#/practice", "#/custom", "#/stats", "#/about"]) {
    await page.goto(`/${hash}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/#/recitation/1");
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.getByRole("button", { name: "Pause" })).toBeVisible();
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await dialog.getByRole("radio", { name: "Amiri" }).check();
  await dialog.getByRole("radio", { name: "Scheherazade New" }).check();
  await expect(page.locator("[data-font-sample]").first()).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    dialog.getByRole("button", { name: "Download backup" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^mafatih-backup-/);
  await page.waitForTimeout(300);
  const violations = await page.evaluate(() => (window as unknown as { policyViolations: string[] }).policyViolations);
  expect(violations).toEqual([]);
});

test("the policy really blocks what it should: an inline script and a request to another site", async ({ page }) => {
  await page.goto("/#/about");
  const reports = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const seen: string[] = [];
        document.addEventListener("securitypolicyviolation", (event) => seen.push(event.violatedDirective));
        const inline = document.createElement("script");
        inline.textContent = "window.ran = true";
        document.body.append(inline);
        fetch("https://example.com/").catch(() => undefined);
        setTimeout(() => resolve(seen), 500);
      }),
  );
  expect(reports.sort()).toEqual(["connect-src", "script-src-elem"]);
  expect(await page.evaluate(() => "ran" in window)).toBe(false);
});
