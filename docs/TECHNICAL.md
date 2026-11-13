# Technical notes

Mafatih is a static single-page app: React 19, TypeScript (strict), Vite, Tailwind 4, no server. Everything the learner does is stored in their browser. This file is how it works and what to keep true when changing it.

## Getting started

Node 22.12 or newer and pnpm (CI uses pnpm 12). After `pnpm install`, run `pnpm exec playwright install chromium` once; set `PW_CHROMIUM_PATH` instead if a Chromium is already installed. The dev server is on port 5173 and the preview used by the browser tests on 4173; both fail rather than move to another port.

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

A single unit test: `pnpm test src/path/file.test.ts`. A single browser spec: `pnpm build`, then `pnpm exec playwright test e2e/name.spec.ts --project=chromium-desktop` (Playwright serves what is in `dist`, so a bare run after a source change tests the old build; `pnpm e2e --project=chromium-desktop` builds first).

Browser tests serve the build with `vite preview` on port 4173 and run in two Chromium profiles (`chromium-desktop`, `chromium-mobile`, a Pixel 7). Set `PW_CHROMIUM_PATH` to use an installed Chromium; set `PW_FULL=1` to add Firefox, WebKit and an iPhone profile (the CI `engines` job does). Do not run two Playwright runs at once: they share the port. The ARIA snapshots (`e2e/aria-snapshots.spec.ts-snapshots`, machine-written, ignored by Biome) pin the accessibility tree of every page; after an intended interface change run `pnpm build && pnpm exec playwright test e2e/aria-snapshots.spec.ts --update-snapshots` and read the diff before committing it. The files are named by viewport class (`desktop`, `mobile`), language and region, so the Firefox and WebKit projects compare against the same files as Chromium; do not regenerate them from another engine without looking at what differs.

## Rules for the code

- No comments anywhere (`check:style`). Names and tests say what code does.
- No TypeScript `any` (Biome `noExplicitAny`); use `unknown` and guards.
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `~/` is `src/`.
- Messages live in `src/i18n/{en,ar}.ts` with the same keys and placeholders; Arabic messages hold no Latin letters outside placeholders; no plural-dependent sentences, no concatenated fragments. Names of sources (`src/app/credits.ts`, whose extract date and reciter names are tied to their sources by `credits.test.ts`) and of languages are constants, not catalog entries.
- To add a message: add the key to `src/i18n/en.ts` (it defines `MessageKey`), then to `src/i18n/ar.ts` (typed `Record<MessageKey, string>`); `i18n.test.ts` then checks the parity, the placeholders and that the Arabic has no Latin letters. To add a font: an entry in `FONTS` (`src/settings/fonts.ts`), its `@fontsource/*` dependency, the credit note `about.fontsNote` in both languages, and the font counts in `e2e/perf.spec.ts` and `e2e/settings.spec.ts`.
- Tests are written first at an agreed seam: S1 pure units (Vitest), S2 data and build outputs, S3 storage, S5 the browser (Playwright with axe). There is no component-test setup (no jsdom), so UI behaviour is tested in the browser.

## Layout

| Path | What is in it |
|---|---|
| `src/app` | shell, routes (`#/`, `#/recitation/:surah[/:ayah]`, `#/practice`, `#/custom`, `#/stats`, `#/about`), About page, `credits.ts` and error boundary |
| `src/text` | Arabic text model (`arabic.ts`), prompts (`prompt.ts`), which marks are typed (`vocalization.ts`) |
| `src/keyboard` | the Arabic (101) key table, fingers, ligature keys, what is typeable, the on-screen guide |
| `src/typing` | the session engine (`session.ts`), the input pipeline (`input.ts`, `useTypingInput.ts`), the surface and the trainer hook |
| `src/practice` | the ladder, the lesson generator, the word list loader, the page and the readout |
| `src/recitation` | Qur'an data access, passages, progress, order, the pages, and `audio/` (reciters, cache, player) |
| `src/custom`, `src/stats` | the Custom page; key statistics, lesson history and the Stats page |
| `src/settings`, `src/storage` | settings and the dialog; the profile, its sanitizers, backup and restore |
| `src/i18n`, `src/ui`, `src/styles`, `src/lib` | catalogs and formatters; shared components; tokens and global CSS; small type guards |
| `data`, `generated` | committed sources; build output (git-ignored) |
| `scripts` | data build, word extraction, style and size checks, the Vite plugins for SEO and CSP |
| `e2e` | Playwright specs, helpers, fixtures and the ARIA baselines |
| `docs` | this file, the device checklist, the plan |

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

Surah data is split into one chunk per surah. A passage is a run of ayat (1 to 4 per setting; a saved larger number is read as 4). Progress per surah is a list of typed ayah ranges, a completion count, the tally of the run in progress (`run`: first-try keystrokes, all keystrokes and typing time, added once per ayah newly typed and reset on completion) and the best accuracy of any finished run (`best`; a star at 0.95 or more), with a resume position. Saves from before these fields are read without them. Audio comes from EveryAyah (`https://everyayah.com/data/<reciter>/<SSS><AAA>.mp3`), is fetched when needed (the next ayah is prefetched), kept by URL in IndexedDB (`mafatih.audio`, version 2: the bytes and the media type of each file, never a `Blob`, because WebKit's private storage refuses blobs, plus one small size record per file so that Settings can show the total without reading the audio; version 1 kept blobs and its store is replaced when the database is upgraded; Settings shows the size and clears both stores, and says so when that fails) and de-duplicated while in flight, and is played from a blob URL through one element with Media Session support. The basmala clip plays first when a passage opens a surah that has one.

## Storage

One localStorage key, `mafatih:profile:2`, holds `{ schema: 2, settings, ladder, stats: { practice, recitation, custom }, history, recitation }`. Every part is read through its own sanitizer that builds a fresh object from known fields, so a broken part falls back to defaults without discarding the rest, and `__proto__`, wrong types and huge lists cannot get in. If storage is unavailable the app runs in memory with a notice; a profile of a newer schema is left alone with a notice; an unreadable one is copied to `…:unreadable` and replaced.

Backup and restore (`transfer.ts`, in the Settings dialog): `{ app: "mafatih", schema: 2, exportedAt, profile }`, at most 2,000,000 bytes, refused as `too-large`, `not-json`, `not-a-backup` or `wrong-version` (the old app's export, with no `app` and `schema` 1, is a `wrong-version`), and replaced only after the learner confirms. A render error shows a screen with Reload and Start over (which erases the profile, not the audio cache, after asking). The boundary catches render errors only: errors in event handlers, effects and promises, and in the two providers above it, are not caught.

## Data

| Source | Used for | Licence |
|---|---|---|
| Tanzil simple text 1.1 (`data/quran-simple.txt`, verbatim, with its copyright block) | Recitation | CC BY 3.0 |
| English Wiktionary via kaikki.org (extract built 2026-10-30) | Practice words | CC BY-SA 4.0 and GFDL |
| FrequencyWords Arabic list (ranking only) | Practice word order | CC BY-SA 4.0 |
| EveryAyah | audio, streamed and never bundled | per reciter |

`pnpm build:data` reads `data/` and writes `generated/`: one JSON per surah (each carries Tanzil's notice) and it checks the committed word list against its rules (counts, coverage per starter letter and mark, size, the blocklist). The word list (`data/practice/words.tsv`) is produced by `pnpm exec tsx scripts/extract-words.ts <kaikki.org-dictionary-Arabic.jsonl.gz> <ar_50k.txt>` (the two inputs are downloaded from the sources in `SOURCES.md`, not committed) and reviewed by a reader; `data/practice/SOURCES.md` has the rules. The list is a derivative of both sources; `SOURCES.md` proposes CC BY-SA 4.0 for it, and the owner has still to confirm that.

## Bundle and security

- Limits (`scripts/check-size.ts`, gzip): entry chunk 130 KB, a surah chunk 80 KB, the Practice list 100 KB; the words must not be in the entry; there are 114 surah chunks. Fonts load on demand (one at first, the others when Settings opens).
- The built page carries a content security policy as a meta tag (GitHub Pages cannot send headers): `default-src 'self'`, `script-src 'self'`, `media-src 'self' blob:`, `connect-src 'self' https://everyayah.com`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'`, plus `strict-origin-when-cross-origin` as the referrer policy. Both are meta tags added by the build only (the dev server has neither); there is no `style-src` or `img-src`, so those fall back to `default-src 'self'`. Consequences: no inline scripts or styles (use CSSOM or adopted stylesheets, also in tests) and no data-URL images.
- `robots.txt` and `sitemap.xml` are emitted by the build from `SITE_URL`; `BASE_PATH` sets the base for project pages, for example `BASE_PATH=/mafatih/ SITE_URL=https://example.org/mafatih pnpm build`; `SITE_URL` must be a plain http or https address (no credentials, query or fragment) or the build fails.

## Deploy

`.github/workflows/deploy.yml`: Pages is configured first, then `pnpm verify` builds and tests with the Pages `BASE_PATH` and `SITE_URL`, and the artifact is that same `dist` (there is no second build, so what is deployed is what was tested; the browser suite expects the app at the root of its address, which holds for the custom domain). Every action is pinned to a commit, not a tag. The Pages deployment runs only for `main`. A separate `engines` job runs the whole suite in Firefox and WebKit on `main` and on demand (Run workflow on any branch); it does not gate the deploy. It starts a PulseAudio null sink first, because a browser without an audio device ends every clip with an error. Tests that need the Chrome DevTools Protocol skip themselves outside Chromium, and a few skip in Firefox with the reason written in `e2e/helpers/engines.ts` (Playwright's Firefox build crashes the page on some role queries and scans,).

## Design decisions, 2026-11-12 (the Focus design)

The look of the app was redesigned in four mockup rounds; the approved mockups are in `docs/design/focus/` and the plan is `docs/superpowers/plans/2026-11-12-focus-redesign.md`. The owner decided:

- Dark only. There is no light theme and no theme setting; the page ignores `prefers-color-scheme`. Background `#08090b`.
- Passage first: centred text with no box, plain-text nav, a quiet outline keyboard. One amber accent (`#e2b062`) marks the caret, the next key, the primary action, progress and stars. The next key uses the "halo" style. There are no finger-zone colours; the finger caption under the keyboard stays and is controlled by "Show which finger to use".
- Scheherazade New is the default value of the lesson font setting. Amiri and Noto Naskh Arabic stay selectable in Settings. The setting changes the lesson text only. The guide keyboard and all other text use a fixed interface font: Noto Naskh Arabic (400 and 600, loaded with the page) for Arabic and the system font for Latin.
- There is no "Start typing" pill. The text is the way in: tap or click it, or Tab to it. The caret blinks while it waits. Custom's form button labelled "Start typing" is a form submit and stays.
- On phones the layout is looser: a top bar with the wordmark and a settings icon, a bottom tab bar that is hidden while the phone keyboard is up (`src/app/softKeyboard.ts`: a text field has the focus and the visible height is under 80% of the tallest height seen at this width, with no pinch zoom; this is the one place `visualViewport` is read), one row of icon controls, no "N of M ayat" line.
- The surah-complete celebration and the star system of the old app return, in amber: rays that keep bursting until the card is closed, a glowing name, and a star for a surah completed with 95% accuracy or better. Reduced motion gets a static card.
- No ring is drawn around the typing text when it is reached with Tab. The caret is the cue: it fades softly (2.4 s) while the text waits and stands still while typing. Every other control keeps the focus ring.
- A passage holds at most four ayat. The owner's experience is that nobody wants more on screen at once, and it makes any per-ayah display (the audio position) predictable. Older saves with a larger number are read as four.
- Nothing in a lesson is underlined while its ayah is recited: the ayah being recited is marked by a background wash only. (Wrong letters are still drawn with a wavy underline, so a mistake never depends on colour alone.)
- The audio controls are the Dial: a ring with one arc per stop (basmala and up to four ayat) sized by word count with a minimum, repeat, previous and next ayah, and a speaker that opens the Audio panel (volume, mute, play whole passage, reciter). Nothing else is written around them: no caption, no surah name and no Go to ayah (removed on 2026-11-13). Passages are changed with Page Down and Page Up anywhere on the passage page (the volume slider and dialogs keep the keys for themselves), or with the two chevron buttons either side of the passage heading (decision D26); a key pressed in the typing field leaves the focus in it.
- The old player's repeat toggle is back as a saved `loop` setting. Both `loop` and `playWhole` (Play whole passage) are on by default, so a first listen plays the passage from its first ayah to its last and starts again; a saved false is kept, and a missing or unreadable value means on, as for the other on-by-default settings. With "Play whole passage" on, the passage starts again from its first stop after the last ayah and keeps playing, and the button is named "Repeat passage". With it off, the ayah that ends plays again and the button is named "Repeat ayah" (the old app's rule, that every clip stopped except the last, which jumped back to the first, was hard to explain and was replaced after the code review of 2026-11-13).
- The search and social images and the favicons get a light touch to match the new look: same composition, new background, amber accent and outlined keycaps.
- Finishing a passage inside a surah shows nothing: the next passage opens at once in the same, still focused typing field (it is never disabled or remounted at a passage boundary, so keys typed without stopping land in the next passage), and audio that was playing carries on. Finishing a surah opens the celebration (accuracy is first-try keystrokes over all keystrokes, the time is the active typing time of the run, mistakes and their corrections included, with a pause longer than 3 seconds never counted, the same clock as Custom and Stats; speed is correct characters per minute over that time), whose Continue goes to the next surah and whose "Type it again" starts the surah over. There is no "Finished" or "Completed" summary on the Recitation page.
- A lesson counts nothing until the first character is typed right: wrong keys before it are ignored for the figures (no mistake, no error, no clock) but not for the eye: the caret still flashes red and shakes once for each, so that the page never looks as if it is not listening, and the clock starts at that first right key. A key that is held down counts once: repeats of a character are ignored (Backspace still repeats, so wrong keys can be deleted quickly).
- A wrong key is shown at the caret and nowhere else: the caret flashes red and shakes once for every counted error (red and ringed, without movement, under reduced motion), and stays red while wrong keys wait for Backspace. There is no "Mistake." line; screen readers get it as a visually hidden message.
- The language can be asked for in the address: `?lang=ar` or `?lang=en`, before or after the `#` (`/?lang=ar#/practice` and `/#/practice?lang=ar`), is read once at start-up (`takeLanguageFromAddress`), beats the saved and the browser's language, is saved like a choice in Settings (`openProfileInLanguage`) and is removed from the address. With storage blocked or newer data in the way the page still opens in that language and nothing is written.
- Stats uses a segmented control for the mode (real radios) and shows the key table and the last-ten-lessons table side by side from `lg`.
- The About page no longer has "How this site was made" or the "Source code" credit. Its link moved from the footer into Settings.

Waivers and rules that changed with these decisions:

- The untyped lesson text (`--color-upcoming`, `#5b5d61`, about 3.0 : 1) is below the 4.5 : 1 text-contrast rule. This is an owner decision. The token test pins a 3.0 : 1 floor, and axe's colour-contrast rule excludes the lesson text only. Every other text keeps 4.5 : 1 and every control outline 3 : 1.
- The rule that every focus indicator is visible (A4) does not apply to the typing text, by the owner's decision.
- The rule "no celebration or scoring on Qur'an content" is reversed for surah completion only. Still no sound, no emoji, no confetti, and nothing is shown while typing.
- The Arabic copy for the new strings is not human verified, like the rest of the Arabic copy.

## Verification status

Not human verified: the Practice word list (chosen by a program, skimmed by the owner, not read word by word), the Arabic copy in `src/i18n/ar.ts` (no native speaker has read it) and the device checklist in `docs/QA-DEVICES.md` (never run). The Firefox and WebKit projects have never run. The About page says the first two to users. The owner decided on 2026-11-12 to ship with these gaps and set the licence and Tanzil questions aside; the details are in the plan.
