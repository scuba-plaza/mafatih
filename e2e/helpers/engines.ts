export const NEEDS_CDP = "needs the Chrome DevTools Protocol, which only Chromium has";
export const FIREFOX_PAGE_CRASH =
  "Playwright's Firefox build crashes the page on this step (a bare six-line table reproduces it), which is a tooling problem and not the app";
export const FIREFOX_AXE_DIALOG_CRASH =
  "Playwright's Firefox build crashes the page in about one run in ten when axe analyses a page with a modal dialog open (measured: 5 of 50 with only Settings open, 0 of 50 without a dialog); the dialog is still checked by axe in Chromium and WebKit";
