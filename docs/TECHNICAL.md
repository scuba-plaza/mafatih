# Technical notes

Mafatih is a static single-page app: React 19, TypeScript (strict), Vite, Tailwind 4, no server. Everything the learner does is stored in their browser. This file is how it works and what to keep true when changing it.

## Commands

```sh
pnpm dev          # build the data, then the Vite dev server
pnpm verify       # the whole gate: lint, comment check, build, size check, types, unit tests, browser tests
pnpm test         # build the data, then the unit tests (Vitest, Node)
pnpm check        # Biome (lint and format check); pnpm check:write fixes
pnpm check:style  # fails on any comment in code
pnpm check:size   # after a build: chunk limits (see Bundle)
pnpm typecheck    # app and node configs
pnpm build:data   # data/ to generated/ (see Data)
pnpm e2e          # build, then Playwright
```

Browser tests serve the build with `vite preview` on port 4173 and run in two Chromium profiles (`chromium-desktop`, `chromium-mobile`, a Pixel 7). Set `PW_CHROMIUM_PATH` to use an installed Chromium; set `PW_FULL=1` to add Firefox, WebKit and an iPhone profile (the CI `engines` job does). Do not run two Playwright runs at once: they share the port.

## Rules for the code

- No comments anywhere (`check:style`). Names and tests say what code does.
- No TypeScript `any` (Biome `noExplicitAny`); use `unknown` and guards.
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `~/` is `src/`.
- Messages live in `src/i18n/{en,ar}.ts` with the same keys and placeholders; Arabic messages hold no Latin letters outside placeholders; no plural-dependent sentences, no concatenated fragments. Names of sources and languages are constants of the component, not catalog entries.
- Tests are written first at an agreed seam: S1 pure units (Vitest), S2 data and build outputs, S3 storage, S5 the browser (Playwright with axe). There is no component-test setup (no jsdom), so UI behaviour is tested in the browser.

## Layout

| Path | What is in it |
|---|---|
| `src/app` | shell, routes (`#/`, `#/recitation/:surah[/:ayah]`, `#/practice`, `#/custom`, `#/stats`, `#/about`), About page, error boundary |
| `src/text` | Arabic text model (`arabic.ts`), prompts (`prompt.ts`), which marks are typed (`vocalization.ts`) |
| `src/keyboard` | the Arabic (101) key table, fingers, ligature keys, what is typeable, the on-screen guide |
| `src/typing` | the session engine (`session.ts`), the input pipeline (`input.ts`, `useTypingInput.ts`), the surface and the trainer hook |
| `src/practice` | the ladder, the lesson generator, the word list loader, the page and the readout |
| `src/recitation` | Qur'an data access, passages, progress, order, the pages, and `audio/` (reciters, cache, player) |
| `src/custom`, `src/stats` | the Custom page; key statistics, lesson history and the Stats page |
| `src/settings`, `src/storage` | settings and the dialog; the profile, its sanitizers, backup and restore |
| `src/i18n`, `src/ui`, `src/styles` | catalogs and formatters; shared components; tokens and global CSS |
| `data`, `generated` | committed sources; build output (git-ignored) |
| `scripts` | data build, word extraction, style and size checks, the Vite plugins for SEO and CSP |
| `e2e` | Playwright specs and helpers; `docs` | this file, the device checklist, the plan |

## Text and typing

- The text on screen is always the verbatim source. What must be typed (the *units*) is derived from it: a letter, a letter with the marks that are asked for, a space, or a lam-alef pair. Marks that are not asked for are drawn and skipped. Dagger alef, the end-of-ayah sign and Arabic-Indic digits are always shown and never typed.
- Marks in one letter's cluster are ordered shadda, then vowel (tanween, sukun), then dagger alef. Never normalise Arabic text with `normalize("NFC")`: it moves the shadda.
- The session (`session.ts`) is immutable: `applyKey(session, key, time, options)` returns a new one. With *require Backspace* on, a wrong key stays at the cursor until deleted and correct text behind the cursor cannot be deleted; off, a wrong key is counted and blocked.
- One sample per position: a first-try hit with its latency, or a miss. A gap over 3 seconds is a pause, never a slow keystroke.
- The input pipeline turns `beforeinput`/`keydown` into one key per character and ignores multi-character inserts (swipe, paste, suggestions), keeps Backspace working on an empty field, and resets the caret. The Windows lam-alef key (two characters) and the Linux presentation forms are both accepted.
- Progress is painted with the CSS Custom Highlight API over a single text run, so cursive joining is never touched: `mafatih-done`, `mafatih-apparatus` (skipped marks), `mafatih-playing` (the ayah being heard).

## Practice and the ladder

`LADDER` is a committed list of 44 rungs: ten home-row letters, 26 other letters, then eight marks. A rung unlocks when the newest key has enough samples, is fast and accurate enough (`DEFAULT_UNLOCK_CONFIG`). Unlocks are earned only in Practice; Recitation and Custom feed Stats only. The generator picks words whose letters are all unlocked, half of them carrying the newest key, until a lesson has about 38 typed characters. Practice never touches the Qur'an: a test checks that no file under `src/practice` reaches it.

## Recitation

Surah data is split into one chunk per surah. A passage is a run of ayat (1 to 20 per setting). Progress per surah is a list of typed ayah ranges plus a completion count, with a resume position. Audio comes from EveryAyah (`https://everyayah.com/data/<reciter>/<SSS><AAA>.mp3`), is fetched once per ayah and kept in IndexedDB (`mafatih.audio`), and is played from a blob URL through one element with Media Session support. The basmala clip plays first when a passage opens a surah that has one.

## Storage

One localStorage key, `mafatih:profile:2`, holds `{ schema: 2, settings, ladder, stats: { practice, recitation, custom }, history, recitation }`. Every part is read through its own sanitizer that builds a fresh object from known fields, so a broken part falls back to defaults without discarding the rest, and `__proto__`, wrong types and huge lists cannot get in. If storage is unavailable the app runs in memory with a notice; a profile of a newer schema is left alone with a notice; an unreadable one is copied to `…:unreadable` and replaced.

Backup and restore (`transfer.ts`, in the Settings dialog): `{ app: "mafatih", schema: 2, exportedAt, profile }`, at most 2,000,000 bytes, refused as `not-json`, `not-a-backup` or `wrong-version`, and replaced only after the learner confirms. A render error shows a screen with Reload and Start over (which erases the profile after asking).

## Data

| Source | Used for | Licence |
|---|---|---|
| Tanzil simple text 1.1 (`data/quran-simple.txt`, verbatim, with its copyright block) | Recitation | CC BY 3.0 |
| English Wiktionary via kaikki.org (extract built 2026-10-30) | Practice words | CC BY-SA 4.0 |
| FrequencyWords Arabic list (ranking only) | Practice word order | CC BY-SA 4.0 |
| EveryAyah | audio, streamed and never bundled | per reciter |

`pnpm build:data` reads `data/` and writes `generated/`: one JSON per surah (each carries Tanzil's notice) and it checks the committed word list against its rules (counts, coverage per starter letter and mark, size, the blocklist). The word list (`data/practice/words.tsv`) is produced by `scripts/extract-words.ts` and reviewed by a reader; `data/practice/SOURCES.md` has the rules. It is shared under CC BY-SA 4.0.

## Bundle and security

- Limits (`scripts/check-size.ts`, gzip): entry chunk 130 KB, a surah chunk 80 KB, the Practice list 100 KB; the words must not be in the entry; there are 114 surah chunks. Fonts load on demand (one at first, the others when Settings opens).
- The built page carries a content security policy as a meta tag (GitHub Pages cannot send headers): `default-src 'self'`, `script-src 'self'`, `media-src 'self' blob: https://everyayah.com`, `connect-src 'self' https://everyayah.com`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, plus a strict referrer policy. Consequences: no inline scripts or styles (use CSSOM or adopted stylesheets, also in tests) and no data-URL images.
- `robots.txt` and `sitemap.xml` are emitted by the build from `SITE_URL`; `BASE_PATH` sets the base for project pages.

## Deploy

`.github/workflows/deploy.yml`: `pnpm verify` runs before the build on every push; the Pages deployment runs only for `main`. A separate `engines` job runs the whole suite in Firefox and WebKit on `main` and on demand; it does not gate the deploy.

## Open questions for the owner

The Practice word list needs a native reader's sign-off (`data/practice/review-report.txt`, `blocklist.txt`, `reject.txt`) and the CC BY-SA 4.0 consequence needs confirming; Tanzil's terms ask that the text is reproduced appropriately (each generated file keeps its notice); the Arabic copy in `src/i18n/ar.ts` has not been read by a native speaker; the device checklist in `docs/QA-DEVICES.md` has not been run.
