export const NEEDS_CDP = "needs the Chrome DevTools Protocol, which only Chromium has";
export const FIREFOX_PAGE_CRASH =
  "Playwright's Firefox build crashes the page on this step (a bare six-line table reproduces it), which is a tooling problem and not the app";
export const FIREFOX_AUDIO_CHAIN =
  "in headless Firefox on a null audio sink the second clip of a chain never ends, so chained playback is covered in Chromium";
