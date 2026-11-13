import type { Page } from "@playwright/test";

export async function addStyle(page: Page, css: string): Promise<void> {
  await page.evaluate((text) => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(text);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, css);
}

export const WIDE_LARGE_TEXT =
  'html { font-size: 200%; } html, body, button, input, select, dialog { font-family: "DejaVu Sans", sans-serif !important; }';
