# Mafatih Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SKILLS, invoked with the Skill tool at the start of every task and kept in force for the whole task: **`tdd`** and **`laws-of-simplicity`**. Execute task by task with the **Task loop** below (implement, review sub-agent, fix every finding, move on). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Rebuild Mafatih from scratch as a coherent Arabic touch-typing trainer in which **Recitation** (the default) types the Qur'an whole, verbatim and in order, and **Practice** drills ordinary, fully vocalized Arabic words chosen by a letter-and-mark unlock ladder, with a mobile-first, bilingual (English and Arabic) interface.

**Architecture:** Pure TypeScript engine modules (text model, typing session, stats and ladder, corpora, recitation progress) with no React, wrapped by thin React feature slices (`practice`, `recitation`, `custom`, `stats`) that share one typing surface and one trainer hook. The text on screen is always the verbatim source; what the user must *type* is derived from it (units), so marks the learner is not yet asked to type are drawn but skipped. Colouring uses the CSS Custom Highlight API over a single text run, so cursive joining is never touched.

**Tech Stack:** React 19, Vite, TypeScript (strict), Tailwind 4, Biome, pnpm, Vitest + Testing Library, Playwright + `@axe-core/playwright`. Data scripts run on Node (`tsx`).

**Spec:** none separate. The design decisions are recorded in this document (see *Decisions*). Behaviour of the old app is the reference for what is kept; read old files with `git show origin/main:<path>`.

---

## How to execute this plan

### Branch and rollout

- All work happens on `claude/clever-thompson-ohqxvp` (the rebuild branch). `main` and the live site (`mafatih.tasrif.xyz`) stay untouched until the cut-over in Task 20.
- Start fresh: the new app uses a new storage key and never reads the old `mafatih.profile`. The IndexedDB audio cache (`mafatih.audio`) is only cached MP3s keyed by URL and is reused as is.
- Do not open a pull request until the user asks for it.
- Commit after every green slice. Commit messages are imperative and describe behaviour.

### Required skills

1. **`tdd`**: vertical slices only (one failing test, then the minimal code, repeat). Never write all tests first. Tests go only at the **seams** below. Expected values come from independent sources (literals, worked examples, the spec), never from re-implementing the code. Refactoring belongs to the review stage, not the red-green loop.
2. **`laws-of-simplicity`**: before each task, state what can be removed (REDUCE) and how the task fits the whole (CONTEXT). After each task, give it a `simplicity_delta` from -5 to +5 and put it in the footer of the review-fix commit (`simplicity_delta: +2`). A change that scores below -2 without a measurable improvement is discarded. Before declaring any bug or missing behaviour, trace the real call path and state the evidence.

### Seams (the only places tests are written)

Approving this plan is the user's confirmation of these seams. A new seam needs the user's approval first.

| Seam | What it is | Catches | Misses |
|---|---|---|---|
| S1 Engine API | Exported functions of `src/{keyboard,text,typing,stats,practice,recitation,settings,i18n}/*.ts` (not their internals) with Vitest, no DOM | Rule and edge-case bugs, regressions in ladder, session and corpus rules | Anything visual or browser-specific |
| S2 Data builds | `scripts/*` pure functions plus assertions in `build:data` against the real committed data | Corpus rule violations, Quran text altered | Content quality only a human can judge (hence review gates) |
| S3 Storage | `loadProfile`, `saveProfile`, `exportProfile`, `importProfile` against an in-memory and a throwing store | Corrupt, hostile or unavailable storage | Real browser quota behaviour |
| S4 Component | One component rendered with Testing Library, queried by role and name only | ARIA roles, names, keyboard behaviour of a single widget | Layout, shaping, real input events |
| S5 Browser | Playwright journeys on `chromium-desktop` and `chromium-mobile` (all engines in CI), including axe scans and ARIA snapshots | Real input, shaping, layout, mobile viewport, end-to-end flows | Real phone keyboards (manual checklist in Task 19) |

### Task loop (run for every task, in order)

1. Invoke `tdd` and `laws-of-simplicity`. Read the task, its Interfaces and Acceptance.
2. Implement slice by slice: red, green, commit. Run the task's tests after each slice.
3. Run the gate: `pnpm verify` (Biome, `check:style`, one build including `build:data`, typecheck, unit tests, then Playwright on chromium desktop and mobile against `vite preview`; `pnpm e2e` alone builds first). It must be green. Fix the root cause of every failure; never skip or loosen a test.
4. **Review sub-agent.** Spawn a fresh `general-purpose` sub-agent with the brief below. **Every sub-agent created for this plan, for reviews or any other purpose, must use model Sonnet 5.5 (`sonnet`) at effort level Medium (`effort: "medium"`).** If the environment does not allow sub-agents, run the same brief yourself as an adversarial reviewer: re-read the whole diff cold and try to break it.
5. The reviewer reports findings only (it does not edit) and hands them back to the main agent in the format `[severity] file:line - finding - how to reproduce - suggested fix`, severities `blocker`, `major`, `minor`, `nit`.
6. **The main agent fixes every finding, including minor and nit ones**, test-first when the finding is a behaviour. If a finding is factually wrong, prove it with evidence in the commit message and leave the code. Re-run the gate. Commit as `Address review of task N` with the `simplicity_delta` footer.
7. Move to the next task. Do not start it with a red gate.

**Review brief (paste into the sub-agent prompt, with the task number and `git diff <task-start>..HEAD`):**

> You are an adversarial reviewer. Review only the changes of task N against the plan's Acceptance, Global Constraints and the contracts below. Assume the code is wrong until you have tried to break it. Run it where you can (`pnpm verify`, `pnpm dev`, Playwright). Prioritise **UI/UX coherence and ARIA correctness**, then correctness, test quality (implementation-coupled or tautological tests are findings), simplicity (dead code, speculative options, anything removable), i18n parity (en/ar), and Qur'an-respect rules. Report findings only, as `[severity] file:line - finding - reproduction - suggested fix`. Do not edit files.
>
> **Accessibility contract (cite as A#):** A1 landmarks and one `h1` per page, heading order never skips; A2 skip link, `aria-current="page"` on active nav; A3 everything operable by keyboard, logical focus order that matches visual order in both LTR and RTL, no keyboard trap (Tab always leaves the typing input); A4 visible focus indicator of at least 3:1; A5 text contrast of at least 4.5:1 and UI contrast of at least 3:1 in light and dark; A6 information never conveyed by colour alone; A7 native elements before ARIA, every control has an accessible name, groups use `fieldset`/`legend`, `aria-pressed`/`aria-expanded`/`aria-current` only where semantically right; A8 dialogs are native `<dialog>` with `aria-labelledby`, Escape closes, focus returns to the opener; A9 live regions are polite, sparse and never announce per keystroke; errors use `role="alert"` and are tied to their field with `aria-describedby`; A10 correct `lang` and `dir` on every mixed-language fragment, logical CSS properties only (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`), except `env(safe-area-inset-left/right)` padding, which is physical by nature and uses `pl-`/`pr-`; A11 `prefers-reduced-motion` honoured; A12 no information or function lost at 200% text zoom or 320 px width.
>
> **Mobile contract (cite as M#):** M1 designed at 320x568 first, `min-width` breakpoints only (`sm` 480, `md` 768, `lg` 1024); M2 viewport meta is `width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content` and never disables zoom; M3 `dvh`/`svh` units, one flexible scroll region (the surface), no magic-number vertical centring, no `visualViewport` JavaScript; M4 touch targets of at least 44x44 CSS px, no hover-only affordances, `touch-action: manipulation`; M5 `env(safe-area-inset-*)` respected; M6 the typing input lives inside the surface at 16 px or larger so browsers scroll it into view natively and iOS does not zoom; M7 dialogs are bottom sheets below `md`; M8 landscape phone with the keyboard open still shows the current line.
>
> **Respect contract (cite as Q#):** Q1 Qur'an text is shown whole, in order, verbatim (no stripping of marks, no reordering, no truncation, no mid-ayah cuts); Q2 Practice never imports or displays Qur'an text and its words come only from the Wiktionary pipeline minus the blocklist; Q3 no confetti, emoji, sound effects or game scoring attached to Qur'an content, completion is quiet; Q4 Qur'an text is never used as decoration or as UI labels; Q5 the audio never moves the cursor and typing never starts audio; Q6 everything about the Qur'an stays optional to hear and never blocks typing.

### Verification commands (defined in Task 0)

```bash
pnpm verify
pnpm test
pnpm e2e --project=chromium-desktop
pnpm build:data
```

---

## Global Constraints

- **Code style (user preference):** no comments anywhere in code (`check:style` fails the build on any comment, found with `oxc-parser` because TypeScript 7 ships no scanner API), and the TypeScript `any` type is never used (`noExplicitAny` is an error in Biome, which is the single place that enforces it; use `unknown` plus type guards and `satisfies`).
- Node `>=22.12`, pnpm (the deploy workflow pins `^12`, the sandbox has 10.28; both use lockfile format 9.0 and no `packageManager` field is set), ES2022, `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`. Biome with 2-space indent, 120 columns, `useBlockStatements` error.
- Dependencies: React 19, Vite, Tailwind 4, Vitest, Playwright, `oxc-parser` (comment check), and, each installed by the task that first uses it: `@axe-core/playwright` (Task 2), `@testing-library/react` with `jsdom` (Task 2, seam S4), `@fontsource/{noto-naskh-arabic,scheherazade-new,amiri}` (Task 8). Nothing else without a reason recorded in the review. Latest stable versions at install time, recorded in Task 0's commit.
- Keyboard layout: **Arabic (101)** (Microsoft `KBDA1`) is the only layout. Port the key table from `git show origin/main:src/engine/layout/ara.ts` (plus `ligatures.ts`, `fingers.ts`).
- Text rules: `shown` text is always the verbatim source; **units** (what must be typed) are derived from it. Marks inside one letter's cluster are canonically ordered **shadda first, then the vowel, tanween or sukun, then dagger alef** (the only 16 mark-run shapes in the Tanzil text all follow it). Never use `String.prototype.normalize("NFC")` on Arabic text (it moves the shadda after the vowel; the Tanzil text already has shadda first on all 23,016 occurrences).
- Marks: `ً ٌ ٍ َ ُ ِ ّ ْ` are the 8 typeable marks. Dagger alef `ٰ` (U+0670, 3,330 occurrences in the Qur'an text), the end-of-ayah sign `۝` and Arabic-Indic digits are shown and skipped, never typed.
- Typing rules: `requireBackspace` defaults to **true**. ON: wrong characters appear at the cursor in the order typed, the expected text stays fully visible after them, every further key is also a mistake until Backspace removes them, correct text behind the cursor can never be deleted. OFF: a wrong key is counted, flagged briefly and **not shown**; the cursor waits for the right key.
- Stats unit: **one sample per position**: first-try hit with latency, or miss (a corrected position is a miss, with no latency). Only the first wrong key at a position is a miss for the per-key stats; further keys while mistakes are pending count in the session's `errors` only. Any gap over `LATENCY_CAP_MS = 3000` is a pause, never a slow keystroke.
- Unlocks are earned **only in Practice**. Recitation and Custom feed the Stats page only.
- Storage key `mafatih:profile:2`, `schema: 2`. Language setting values `en` and `ar`. UI copy: no plural-dependent sentences (use `label: value` patterns), no concatenated fragments, sentence case.
- Hash routes: `#/` (Recitation, the default), `#/recitation/:surah[/:ayah]`, `#/practice`, `#/custom`, `#/stats`, `#/about`.
- Licences: Tanzil text (CC BY 3.0, `data/quran-simple.txt` kept verbatim with its copyright block), Wiktionary via kaikki.org (CC BY-SA 4.0) and the FrequencyWords Arabic list (CC BY-SA 4.0, ranking only), EveryAyah audio (streamed, never bundled). Share-alike applies to the committed practice word list; the owner confirms the licensing consequence in Task 10.

## Review Focus

The five failure modes the brief implies but no single task's happy path exercises, most likely first. Each has a pinned test in the task named.

1. **Mark order and ligature spellings:** a user types the vowel before the shadda (or the shadda first); Windows sends the lam-alef key as two characters in one event while xkb sends one presentation form (`ﻻ ﻷ ﻹ ﻵ`). Expected: both accepted, one sample per key (Tasks 5 and 6).
2. **Phone keyboards:** Android composition events with `Unidentified` keydown, Backspace on an empty input, swipe or suggestion inserts of whole words, paste, caret moved by long-press. Expected: one character is one key, multi-character inserts are ignored, Backspace always reaches the engine, the caret is reset (Task 6).
3. **Storage that is unavailable, corrupt or hostile:** private-mode `SecurityError`, quota exceeded, JSON of another schema, `__proto__` keys, a 5 MB import. Expected: the app runs in memory with a visible notice and never crashes (Tasks 7 and 17).
4. **Degenerate custom text:** empty, whitespace only, Latin only, marks only, 5,000+ characters, newlines. Expected: a clear inline message, never a crash or an empty lesson (Task 8).
5. **Tab hidden or input blurred mid-lesson, and language switched mid-lesson:** no ten-minute latency sample, no lost session, direction flips without losing the cursor (Tasks 5, 8 and 9).

---

## Decisions

Answers you gave:

| # | Decision |
|---|---|
| D1 | Practice words come from a Wiktionary extract (kaikki.org, CC BY-SA 4.0), ranked by an open frequency list, committed as a reviewed data file. |
| D2 | A reviewable blocklist keeps sacred words out of Practice: names used only for Allah or the sacred, all proper nouns (so prophets and angels), and `قرآن آية سورة نبي رسول`. Practice never contains definite (`ال`) noun forms. Everyday words that are also divine names when definite (`كبير`, `واحد`, `نور`) stay as ordinary indefinite words. |
| D3 | Recitation always shows the ayah verbatim. The vocalization level only decides which marks must be **typed**; untyped and untypeable marks are drawn and skipped. |
| D4 | Unlocks are earned in Practice only. |
| D5 | Vitest, Playwright and axe for tests. |
| D6 | Kept: Recitation audio, Custom, Stats, import/export. Mobile is designed in from the start (see the Mobile contract), not ported. |
| D7 | Interface in English and Arabic (RTL), switchable in Settings. |
| D8 | Rebuild branch with a final cut-over, no migration of old data. |
| D9 | `requireBackspace` setting, default on. Mistakes are inserted at the cursor in typed order (expected text stays visible after them). Off blocks and does not show. |
| D10 | Vocalization setting: **Auto**, Letters only, Harakat, Full. Auto uses **one ladder**: the 36 letters first (home row first), then the marks one at a time (fatha, kasra, damma, sukun, shadda, fathatan, kasratan, dammatan). On Auto you type exactly the marks you have unlocked. |

Decisions I made (veto any of them; each is cheap to change before its task starts):

| # | Decision | Why |
|---|---|---|
| A1 | The fresh-user starter set is the **ten home-row keys** `ش س ي ب ل ا ت ن م ك`. | Measured on the prototype list (29,265 fully vocalized forms): 193 distinct letters-only words within the top 20,000 by frequency, at least 17 words per letter. The earlier 6-letter start gave only 47. |
| A2 | Input comes from one real `<input>` inside the typing surface on every platform (`beforeinput`), not from `keydown` mapping. | One pipeline for desktop and phones, native scroll-into-view, no `visualViewport` hack, Backspace and composition handled once. |
| A3 | Phones use the user's own OS Arabic keyboard; the on-screen guide keyboard shows only on wide screens with a fine pointer. | The guide teaches the physical 101 layout, which phones do not have. If you want an in-app touch keyboard instead, that is a new task. |
| A4 | Colouring and the playing-ayah highlight use the **CSS Custom Highlight API**, not per-character spans or a stacked clip layer. Browsers without it still show the caret and mistakes, only without tint. | Single text run, no shaping risk, deletes the old canvas measuring and line-chunking code. |
| A5 | No confetti or burst on surah completion; a quiet panel instead. | Respect contract Q3. |
| A6 | Custom text shows verbatim and skips untypeable characters (Latin letters and so on), like everywhere else. | One rule, no silent deletion of the user's text. |
| A7 | Stats are stored per mode (`practice`, `recitation`, `custom`); the Stats page shows one mode at a time. | Keeps ladder stats clean without merging moving averages. |
| A8 | Paste, drop, swipe and suggestion inserts longer than the two characters of a ligature key are ignored. | Otherwise a keyboard could type the lesson for you. |
| A9 | Pending mistakes are capped at 10; further keys are ignored but counted as errors. | Stops a stuck key from filling the screen. |
| A10 | One `#/about` page holds Privacy and Credits. Light and dark follow the system; there is no theme setting. | Fewer routes and settings. |
| A11 | In the Arabic UI numbers use Arabic-Indic digits; surah names show the Arabic name only (English UI adds transliteration and the English name). | Consistent with the ayah signs. |
| A12 | Mastery constants start at 8 samples, 700 ms for letters, 1000 ms for marks (Shift layer), 95% recent accuracy; they live in one config object for tuning. | Taken from the old tuning, marks given slack for Shift. |
| A13 | No PWA or offline mode in this plan. | YAGNI; can follow later. |

Measured on 2026-11-10 (exploratory prototype, not final): kaikki Arabic dump 72 MB gzipped (868 MB JSONL, built 2026-10-30); 54,470 fully vocalized candidate forms, 29,265 after dropping obsolete, rare and dialect senses; 8,286 Wiktionary forms put the vowel before the shadda (so canonical ordering is required); the list contained forms that look doubtful (for example `لَيَسٌ`, `لَكَنٌ`), which is why Task 10 ends with a native-reader review gate.

---

## File structure

```
data/quran-simple.txt, data/surahs.json        kept verbatim from main
data/practice/{words.tsv,blocklist.txt,reject.txt,SOURCES.md}
scripts/{build-data.ts,extract-words.ts,check-style.ts,lib/*.ts}
e2e/{*.spec.ts,helpers/*.ts,fixtures/*.mp3}
src/i18n/        messages.ts en.ts ar.ts i18n.tsx format.ts
src/keyboard/    layout101.ts ligatures.ts fingers.ts typeable.ts GuideKeyboard.tsx
src/text/        arabic.ts vocalization.ts prompt.ts collapse.ts
src/typing/      session.ts metrics.ts input.ts useTypingInput.ts useTrainer.ts TypingSurface.tsx highlights.ts useCursorRect.ts
src/stats/       keystats.ts StatsPage.tsx
src/practice/    words.ts ladder.ts lesson.ts PracticePage.tsx Hud.tsx
src/recitation/  quran.ts passage.ts progress.ts order.ts RecitationPage.tsx SurahMap.tsx PassageBar.tsx audio/*
src/custom/      CustomPage.tsx
src/settings/    settings.ts fonts.ts SettingsDialog.tsx
src/storage/     storage.ts profile.ts transfer.ts audio-cache.ts TransferDialog.tsx
src/ui/          Dialog Button SegmentedControl Switch Field VisuallyHidden Status
src/app/         routes.ts App.tsx Shell.tsx Header.tsx Footer.tsx AboutPage.tsx ErrorBoundary.tsx
src/styles/      tokens.css globals.css
```

## Shared contracts (used by several tasks; owners named)

```ts
type Mode = "practice" | "recitation" | "custom"
interface Unit { text: string; start: number; end: number }
interface Prompt { shown: string; units: readonly Unit[]; breaks: readonly number[] }
type Key = { kind: "char"; char: string } | { kind: "backspace" }
interface Sample { expected: string; correct: boolean; latencyMs: number | null }
type Vocalization = "auto" | "letters" | "harakat" | "full"
```

`Prompt`, `Unit`, `Vocalization` belong to Task 4; `Key`, `Sample` to Task 5; `Mode` to Task 7.

---

### Task 0: Scaffold and tooling

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `tsconfig.node.json` (scripts and configs, no DOM types), `biome.json`, `playwright.config.ts`, `vite.config.ts` (also holds the Vitest `test` block), `index.html`, `src/main.tsx`, `scripts/check-style.ts`, `scripts/lib/comments.ts`, `scripts/check-style.test.ts`, `e2e/smoke.spec.ts`
- Delete: old `src/`, `cypress/`, `cypress.config.mjs`, `scripts/build-corpus.ts`, `docs/TECHNICAL.md` (all remain in git history and on `main`)
- Keep: `data/`, `public/`, `.github/workflows/deploy.yml` (adapted in Task 18)

**Interfaces:**
- Produces: `pnpm verify`, `pnpm test`, `pnpm e2e`, `pnpm check`, `pnpm check:style`, `pnpm typecheck`, `pnpm build:data`, `pnpm build`, `pnpm dev`; path aliases `~/*` and `~generated/*`; Playwright projects `chromium-desktop` and `chromium-mobile` (Pixel 7); the other engines (`firefox`, `webkit`, `webkit-mobile`) and a CI step for them are added in Task 19, when they are first run; `PW_CHROMIUM_PATH` sets `executablePath` (cloud sandbox: `/opt/pw-browsers/chromium`, NixOS: the nixpkgs build).
- `check-style` exits non-zero on any comment (including `///` directives, JSX comments, hashbangs and `biome-ignore`) in every `.ts/.tsx/.js/.mjs/.cjs`, `.css`, `.html` and `.json` file under `src/`, `scripts/`, `e2e/` and at the repository root, using `oxc-parser` for scripts (a file that does not parse is an error). `any` is enforced by Biome alone. CI is the existing `.github/workflows/deploy.yml`, which now runs `pnpm verify` before it builds (no second workflow file).

- [ ] **Step 1: Failing test** `scripts/check-style.test.ts`: `findViolations("const a = 1 // x")` reports one comment; `"/* x */"` one; `'const u = "https://x.y"'` none; `"let a: any"` one `any`; `"function f(a: Array<any>) {}"` one; clean source none.
- [ ] **Step 2: Run** `pnpm test scripts/check-style.test.ts`, expect FAIL (module missing).
- [ ] **Step 3: Implement** `findViolations(source: string): readonly { line: number; kind: "comment" | "any" }[]` by scanning with `ts.createScanner` for comment tokens and walking the AST for `SyntaxKind.AnyKeyword`; the CLI walks the three directories.
- [ ] **Step 4: Run** the test, expect PASS.
- [ ] **Step 5: Failing e2e** `e2e/smoke.spec.ts`: the page `/` has `<title>` "Mafatih", `html[lang]` set, and a `main` landmark. Run `pnpm e2e --project=chromium-desktop`, expect FAIL.
- [ ] **Step 6: Implement** the minimal React entry and configs; the deploy workflow installs Chromium and runs `pnpm verify`, and only its deploy job holds the Pages write permissions. Run the e2e, expect PASS.
- [ ] **Step 7: Gate and review** per the Task loop; commit `Scaffold the rebuild`.

**Acceptance:** `pnpm verify` green on an almost empty app; `biome.json` has `noExplicitAny: error`; the old code is gone from the tree.

### Task 1: i18n core (English and Arabic)

**Files:** Create `src/i18n/{en.ts,ar.ts,i18n.ts,i18n.test.ts}` (Task 2 adds `I18nProvider.tsx`).

**Interfaces:**
- Produces (`src/i18n/i18n.ts`): `type Language = "en" | "ar"`; `isLanguage(value: unknown)`; `type MessageKey = keyof typeof en`; `placeholdersOf(template: string): string[]`; `fillMessage(lang: Language, template: string, params?: Readonly<Record<string, string | number>>): string` (numbers are formatted in the language's digits; text values are wrapped in the bidi isolates U+2068 and U+2069 so mixed-direction values cannot reorder a sentence, which means UI tests match such messages by their parts; a missing value throws, even when the placeholder is named like an `Object.prototype` member); `translate(lang: Language, key: MessageKey, params?): string`; `directionOf(lang: Language): "ltr" | "rtl"`; `detectLanguage(preferred: readonly string[]): Language`; `formatNumber(lang, n: number): string` (whole numbers, never `-0`) and `formatPercent(lang, ratio: number): string`, both of which throw a `RangeError` on a value that is not finite, so callers handle their empty states explicitly. The React side, `<I18nProvider language>` and `useI18n(): { lang, dir, t(key, params?), formatNumber, formatPercent }`, is added by Task 2, its first user.

- [ ] Test: `detectLanguage(["ar-EG","en"])` is `"ar"`, `["fr","en"]` is `"en"`, `[]` is `"en"`.
- [ ] Test: `directionOf("ar")` is `"rtl"`, `"en"` is `"ltr"`.
- [ ] Test: `formatNumber("en", 1234)` is `"1,234"`; `formatNumber("ar", 1234)` is `"١٬٢٣٤"`; `formatPercent("en", 0.953)` is `"95%"`.
- [ ] Test: `Object.keys(en)` equals `Object.keys(ar)`; for every key the sets of `{param}` placeholders are equal; every `ar` value contains an Arabic letter and no Latin letter outside its placeholders.
- [ ] Test: `fillMessage` substitutes and a missing param throws (a typo must not ship). The task that adds the first parameterised catalog key also adds a `translate` test for that key with its params in both languages.
- [ ] Implement the catalog with only the keys used so far; each later task adds its keys in both files (the parity test enforces it). Arabic copy is a first draft the owner reviews in Task 19.
- [ ] Gate, review, commit.

### Task 2: Design tokens, UI primitives, app shell and routing

**Files:** Create `src/styles/{tokens.css,globals.css,tokens.test.ts}`, `src/ui/PageHeading.tsx`, `src/i18n/I18nProvider.tsx`, `src/app/{routes.ts,routes.test.ts,useRoute.ts,pages.ts,App.tsx,Shell.tsx}`, `e2e/shell.spec.ts`, `e2e/helpers/axe.ts`.

**Interfaces:**
- Produces: `type Route = { page: "recitation"; surah: number | null; ayah: number | null } | { page: "practice" } | { page: "custom" } | { page: "stats" } | { page: "about" }`; `parseRoute(hash: string): Route` (lenient: unknown hashes fall back to Recitation, surah is 1 to 114, ayah 1 to 286); `formatRoute(route: Route): string` (the one canonical address); `useRoute(): Route` (memoised on the hash; a non-canonical hash is rewritten with `replaceState`; `navigate`/`replace` helpers are added by the task that first needs them); `type Page`, `PAGE_TITLES`; `<Shell page children>` (landmarks, navigation list, skip control, document title, focus moved to the page's `h1` on a page change); `<PageHeading>` (every page renders its own single `h1` with it); `<I18nProvider language>` and `useI18n(): { language, direction, t }` (number formatters are exposed by the first task that renders numbers).
- The skip control is a `<button>` in the header that takes its own row when focused: with hash routing an in-page `#main` link would change the route.
- The other primitives arrive with their first users: `Dialog` in Task 8, `SegmentedControl`, `Switch`, `Field` in Task 9, `Status` in Task 8; `ErrorBoundary` in Task 18; the Settings button in Task 9.
- Design tokens are CSS custom properties declared in a Tailwind `@theme` block (the default palette and breakpoints are cleared), redefined for dark under `prefers-color-scheme`, with `color-scheme: light dark`. A token is added, with its contrast pair in `tokens.test.ts`, only when something uses it.

- [ ] Test (S1): `parseRoute("")`, `"#/"` give Recitation with null surah and ayah; `"#/recitation/36/21"` gives surah 36 ayah 21; `"#/recitation/999"` clamps to Recitation without surah; `"#/practice"`, `"#/custom"`, `"#/stats"`, `"#/about"`; `formatRoute(parseRoute(h))` round-trips for every valid `h`.
- [ ] Test (S1): token contrast: for every foreground/background token pair declared in a `PAIRS` table in the test, the WCAG ratio is at least 4.5 (text) or 3 (UI) in both schemes, computed from the hex values in `tokens.css`.
- [ ] Test (S5): on both projects and for `locale: "en"` and `"ar"` and `colorScheme: "light"` and `"dark"`, every route renders without axe violations; there is one `h1`; the skip control is the first tab stop, fully visible, and moves focus to `main`; tab order follows reading order in LTR and RTL with a visible focus outline at every stop; the active nav link has `aria-current="page"` and its label keeps its width; Back and Forward focus the heading and rename the document; `html` has the right `lang` and `dir`; no horizontal scroll at 320 px, also with text at 200%; a display cutout pads the same physical side in both directions (CDP `Emulation.setSafeAreaInsetsOverride`); every interactive element is at least 44x44 on `chromium-mobile`.
- [ ] Implement the shell mobile-first: `grid-template-rows: auto 1fr auto` with `min-height: 100dvh`; header holds the brand, the primary `<nav aria-label>` (Recitation, Practice, Custom, Stats) and a Settings button; footer links to About. Routes render placeholder pages with real headings.
- [ ] Gate, review, commit.

**Acceptance:** A1-A5, A10-A12, M1-M5, M7 hold for the shell. `#/` is Recitation.

### Task 3: Arabic (101) keyboard model

**Files:** Create `src/keyboard/{layout101.ts,ligatures.ts,fingers.ts,typeable.ts}` and tests. Port data from `git show origin/main:src/engine/layout/{ara,ligatures,fingers}.ts` and read the old `ara.test.ts`, `fingers.test.ts` as the spec.

**Interfaces:**
- Produces: `WIN101_CAPS`; `interface KeyStroke { code: string; shift: boolean }`; `strokeFor(char: string): KeyStroke | undefined`; `reachOf(char: string): number` (0 home keys, 0.5 for `ل ا`, plus 1 for Shift); `type Finger`; `fingerOf(code: string): Finger | undefined` (undefined for a key that is not on the layout); `TYPEABLE_LETTERS` (36); `MARKS` (the 8, in layout order); `TYPEABLE_PUNCTUATION` (45); `isTypeable(char: string): boolean`; `HOME_ROW_LETTERS: readonly string[]` (the ten keys A S D F G H J K L Semicolon); `LIGATURE_KEYS: ReadonlyMap<string, string>`; `expandLigature(form: string): string`; `isLigatureForm(char: string): boolean`.

- [ ] Test: `strokeFor("ض")` is `{code:"KeyQ",shift:false}`; `strokeFor("َ")` is `{code:"KeyQ",shift:true}`; `strokeFor("أ")` is Shift+`KeyH`; `strokeFor("ء")` is `KeyX`; `ﻻ` is on `KeyB`, `ﻷ ﻹ ﻵ` on Shift+`KeyG`, Shift+`KeyT`, Shift+`KeyB`.
- [ ] Test: `TYPEABLE_LETTERS.length` is 36; `HOME_ROW_LETTERS` equals the set `{ش س ي ب ل ا ت ن م ك}`; `isTypeable("ٰ")` (dagger alef) and `isTypeable("۝")` are false; `isTypeable(" ")` true.
- [ ] Test: `reachOf("ش")` is 0, `reachOf("ل")` is 0.5, `reachOf("َ")` is 2.5 (KeyQ 1.5 plus Shift 1), `reachOf("ذ")` is 3.
- [ ] Test: every key code is assigned to the finger touch typing gives it (a literal table of all 47 keys). The shared tint of the two index fingers is a Task 9 test, where the tints exist.
- [ ] Test: `expandLigature("ﻻ")` is `"لا"` and `expandLigature("ب")` is `"ب"`.
- [ ] Implement by porting the tables; no logic is re-derived. Gate, review, commit.

### Task 4: Arabic text model and prompts

**Files:** Create `src/text/{arabic.ts,vocalization.ts,prompt.ts}` and tests.

**Interfaces:**
- Consumes: `isTypeable`, `MARKS`, `LIGATURE_KEYS` (Task 3).
- Produces: `canonicalizeMarks(text: string): string`; `skeleton(text: string): string` (letters only, all marks removed); `isFullyVocalized(word: string): boolean`; `type Vocalization = "auto" | "letters" | "harakat" | "full"`; `requiredMarks(v: Vocalization, unlocked: ReadonlySet<string>): ReadonlySet<string>` (`letters` empty, `harakat` the five basic marks, `full` all eight, `auto` exactly `unlocked`); `buildPrompt(shown: string, required: ReadonlySet<string>, breaks?: readonly number[]): Prompt`, where a unit's `start` and `end` are UTF-16 offsets into `shown` (the same offsets a DOM `Range` uses); the mark constants (`FATHA` ... `DAGGER_ALEF`), `HARAKAT`, `TANWEEN` and `isMark(char)`. Whitespace collapsing and the expansion of pasted lam-alef presentation forms belong to Task 8, their only user; a text has nothing to type when `buildPrompt(...).units` is empty.
- `src/text/arabic.ts` defines the basic harakat (fatha, damma, kasra, sukun, shadda) and the tanween (fathatan, dammatan, kasratan) once; a test proves the two sets partition Task 3's `MARKS`.
- A unit is one typeable character, except that a lam directly followed (in unit order) by an alef-family letter merges into one two-character unit whose `start`/`end` span any skipped marks between them.

- [ ] Test (S1, Q1): over every ayah in `data/quran-simple.txt` (read from disk), `canonicalizeMarks(ayah) === ayah`, proving the Qur'an text needs no re-ordering and is never altered.
- [ ] Test: `canonicalizeMarks("ب\u0651\u064E")` and `canonicalizeMarks("ب\u064E\u0651")` both give `"ب\u0651\u064E"` (shadda first); a dagger alef `\u0670` always ends the cluster.
- [ ] Test: `isFullyVocalized` is a strict grammar that fails closed: each letter carries at most one shadda and exactly one vowel, tanween or sukun in canonical order, or is a long vowel after its vowel; the word starts with a vowelled letter; tanween only ends the word (optionally before its silent alef or alef maksura); teh marbuta only ends it; forms outside the practice list's scope (`كَتَبُوا`, `الْكِتَابُ`, `عَمْرٌو`, `مِائَةٌ`) are rejected rather than guessed at. On the prototype list this rejects 78 of 29,265 forms, all malformed (doubled marks, a sukun on the first letter). It is true for `كِتَابٌ`, `مِنْ`, `بَيْتٌ`, `يَكْتُبُ`, `اِبْنٌ`, `هُدًى`, `آمَنَ`; false for `كتاب`, `كِتَاب` (bare final letter), `بَيت` (the yeh needs a sukun), `"ب\u0651\u064E"` (shadda plus vowel) is true while `"ب\u0651"` (shadda alone) is false; any word with `ٰ` is false.
- [ ] Test: `buildPrompt("كِتَابٌ", ∅)` typed text (units joined) is `"كتاب"` and `shown` is unchanged; with all eight marks it is `"كِتَابٌ"`; with the five basic marks the tanween is shown but not a unit.
- [ ] Test: `buildPrompt("هَٰذَا", full)` never makes the dagger alef a unit and `shown` keeps it.
- [ ] Test: `buildPrompt("لا", ∅)` has one unit `"لا"`; `buildPrompt("لَا", ∅)` has one unit `"لا"` spanning `start 0, end 3`; `buildPrompt("لَا", full)` has three units (no merge across a required mark).
- [ ] Test: `requiredMarks("auto", new Set(["َ"]))` is exactly that set; `buildPrompt("hello", full).units` is empty (feeds Task 8's empty message).
- [ ] Implement, deriving "marks" and "letters" from Task 3's tables. Gate, review, commit.

### Task 5: Typing session engine

**Files:** Create `src/typing/session.ts` and `src/typing/session.test.ts`.

**Interfaces:**
- Consumes: `Prompt`, `Unit` (Task 4).
- Produces: `Key`, `Sample` (shared contracts); `interface SessionOptions { requireBackspace: boolean }`; `Session` (immutable; fields callers may read: `prompt`, `units` (always the same length and offsets as `prompt.units`; only the texts of one letter's marks may trade places), `cursor` and `origin` (both count the prompt's own units, so `createSession(prompt, session.cursor)` resumes exactly there), `mistakes: readonly string[]` (one entry per wrong character shown), `errors`, `samples: readonly Sample[]`, `startedAt`, `finishedAt`, `lastError: { at: number; char: string } | null`); `createSession(prompt: Prompt, origin?: number): Session`; `applyKey(s: Session, key: Key, at: number, options: SessionOptions): Session`; `pause(s: Session, at: number): Session` (stops the clock; the next key simply starts it again with no latency, so there is no `resume`); `isComplete(s: Session): boolean`; `expectedText(s: Session): string | undefined`; `view(s: Session): { doneUntil: number; mistakes: string }` (`doneUntil` is the `start` of the next unit, or the end of `shown`); `metricsOf(s: Session, now?: number): { elapsedMs: number; typedChars: number; cpm: number; wpm: number; accuracy: number; errors: number }`; `LATENCY_CAP_MS = 3000`; `MAX_PENDING_MISTAKES = 10`. Callers take new samples with `session.samples.slice(from)`.
- Decisions inside the engine: a multi-character key that is not exactly the expected unit (the lam-alef key where no lam-alef unit is due) is applied one character at a time, each wrong character its own mistake, and only its first character can carry a latency; a lam-alef unit typed as two letters is two samples and the unit is never split (the session tracks how far into it the typist is); marks of one letter typed in the other order swap the two units' texts, so the done part of the text still grows one slot at a time; a miss is recorded against the key that then fixes the position; the first key of a session, the first key after a pause and any key after a gap above the cap have `latencyMs: null`; Backspace with nothing pending is not activity, Backspace that removes a mistake is; a timestamp that is not finite or runs backwards is treated as the latest time seen; with `requireBackspace` off, mistakes left pending from when it was on are dropped; an empty key and any key after completion change nothing; a session created with nothing left to type is complete with `finishedAt: null`.

- [ ] Slice: correct keys advance and the last unit sets `finishedAt`; `view().doneUntil` skips trailing skipped marks (typing `ب` of `بَ` with marks skipped puts `doneUntil` at 2).
- [ ] Slice ON mode: a wrong char gives `mistakes: ["س"]`, `cursor` unchanged; a second wrong key appends; typing the **correct** key while mistakes are pending is also a mistake; Backspace pops one; after clearing, the correct key advances; the position produces **one** `Sample` (`correct: false`, `latencyMs: null`) while `errors` counts every wrong stroke (a cascade of 3 gives `errors === 3`); Backspace with nothing pending changes nothing and cannot touch completed units.
- [ ] Slice: with 10 pending mistakes an 11th key is ignored and `errors` still increments (A9).
- [ ] Slice OFF mode: a wrong key leaves `mistakes` empty, increments `errors`, sets `lastError`; Backspace is a no-op; the right key then advances; the position's sample is a miss.
- [ ] Slice: mark-order tolerance (Review Focus 1): for units `[ب, ّ, َ]` typing `َ` then `ّ` completes both in ON and OFF mode with two correct samples; the reverse order also works.
- [ ] Slice: ligature unit `"لا"` accepts the two-character key `{char:"لا"}` as one sample keyed `"لا"`; accepts `ل` then `ا` as two samples; a wrong key where it is due is a miss keyed `"لا"`.
- [ ] Slice: a 5-second gap gives `latencyMs: null` for that correct sample and adds nothing to `elapsedMs` beyond the cap; after `pause`, ten minutes away add nothing to `elapsedMs` and the next key has `latencyMs: null` (Review Focus 5).
- [ ] Slice: `createSession(prompt, 3)` starts at unit 3, earlier units are not counted in `typedChars`; accuracy is first-try positions over attempted positions.
- [ ] Implement with immutable updates; mistakes are stored as typed strings. Gate, review, commit.

### Task 6: Input pipeline

**Files:** Create `src/typing/{input.ts,input.test.ts}`. The hook `useTypingInput` and its browser tests are built in Task 8 together with the typing surface, its first user.

**Interfaces:**
- Consumes: `Key` (Task 5), `expandLigature` (Task 3).
- Produces: `INPUT_SENTINEL = "\u200b"` (the one invisible placeholder the field always holds, so Backspace has something to delete); `interface InputChange { keys: readonly Key[]; wrongLayout: boolean }`; `diffInput(previous: string, current: string): InputChange`, which compares the field's value before and after an `input` event. Working from the value instead of from `beforeinput` data covers desktop keyboards, phone keyboards that build a word in a composition, and Backspace with one rule.
- Rules: the placeholder is never text (it is stripped from both values, wherever the caret put it); a Backspace is reported for the placeholder only when it disappears from an otherwise empty field; every visible character removed after the shared prefix is one Backspace and is always reported, even when what replaced it is not typing; the added text is one key only when it is a single character or exactly a lam-alef pair (after expanding presentation forms); a letter of any non-Arabic script sets `wrongLayout` and is never a key; a non-breaking space is a space; control and format characters are never keys.
- Contract for the hook (Task 8): it stores the field's value after **every** `input` event (also ones that produced nothing, and during a composition) and passes it as `previous` next time; it ignores events whose `inputType` is a forward delete, because a value alone cannot tell Delete from Backspace.

- [x] Test (S1): one added character is one char key; nothing changed is no key; the placeholder deleted from an empty field is a Backspace; a caret before the placeholder, select-all then type, or a composition that swallowed the placeholder still read as just the typed character.
- [x] Test: the Windows lam-alef key (`"لا"` added at once) is one key with char `"لا"`; the xkb forms `ﻻ ﻷ ﻹ ﻵ` give the same keys.
- [x] Test: anything longer than one key's worth (two unrelated letters, a letter with marks, a pasted sentence, an emoji sequence) types nothing (A8); letters of other scripts (Latin, accented, full-width, Cyrillic, Greek) set `wrongLayout`; digits and punctuation of any script stay keys; line breaks, tabs, zero-width joiners and lone surrogates are not keys.
- [x] Test (Review Focus 2): a composition that grows (`"ب"` to `"بت"`) yields only the newest letter; one that shrinks yields a Backspace per removed character; a replaced letter is a Backspace then the letter; a suggestion that rewrites the word yields only the Backspaces for what it removed.
- [x] Implement. Gate, review, commit.

### Task 7: Settings and profile storage

**Files:** Create `src/settings/settings.ts`, `src/storage/{guards.ts,profile.ts,profile.test.ts,ProfileProvider.tsx,StorageNotice.tsx}`, `e2e/storage.spec.ts`; the shell gets a `banner` slot between the header and `main`.

**Interfaces:**
- Consumes: `Language`, `detectLanguage`, `isLanguage` (Task 1).
- Produces: `interface Settings`, which starts with `language` only and **grows with its users**: each later task adds the settings it introduces (Task 8: `font`, `fontSize`, `customText`; Task 9: `vocalization` default `"auto"`, `requireBackspace` default `true`, `showKeyboard`, `fingerColours`; Task 14: `ayatPerLesson` default 4, `surahOrder`; Task 15: `reciter`, `volume`, `muted`, `playWholePassage`), each with its default, its line in `sanitizeSettings` and a sanitizer test in `profile.test.ts`; `defaultSettings(preferred: readonly string[]): Settings`; `sanitizeSettings(raw: unknown, preferred: readonly string[]): Settings` (builds a fresh object from known fields only); `interface KeyValueStore { getItem(k: string): string | null; setItem(k: string, v: string): void }` (`removeItem` is added by Task 18's Start over); `interface Profile { schema: 2; settings: Settings }` (later tasks add `history`, `ladder`, `stats`, `recitation`, each with its own `sanitize*` and a round-trip test); `type StorageNotice = "unavailable" | "reset" | "newer" | null`; `openProfile(store: KeyValueStore | null, preferred: readonly string[]): { profile: Profile; notice: StorageNotice; save(profile: Profile): StorageNotice }`; `STORAGE_KEY = "mafatih:profile:2"`; `UNREADABLE_KEY = "mafatih:profile:2:unreadable"`; `<ProfileProvider>` and `useProfile(): { profile; notice }`; `<StorageNotice />` (an always-present `role="status"` region filled after mount so it is announced, with an icon and a Dismiss button that keeps its state in memory); `isRecord(value: unknown)` in `guards.ts`.
- Storage decisions: unreadable data is copied to `UNREADABLE_KEY` when it is found, before anything can overwrite it, and the visitor is told the app started fresh; data whose `schema` is a higher number was written by a newer version, so the app runs on defaults, says so, and `save` never writes over it; when storage cannot be read at all, `save` reports `"unavailable"`.
- Task 8, the first writer, adds `update(change: (p: Profile) => Profile): void` to `useProfile` (calling `save` and showing the notice it returns) and listens for the `storage` event so that a second tab adopts what the first one saved instead of silently overwriting it; within one instant the last writer still wins.

- [ ] Test (S3): a fresh store gives defaults with the detected language and `requireBackspace === true`; save then load round-trips.
- [ ] Test: corrupt JSON, a different `schema`, and a non-object all give defaults with notice `"reset"` and do not throw; the old key `mafatih.profile` is never read.
- [ ] Test: a store whose `getItem` throws `SecurityError` gives defaults with `"unavailable"`; `setItem` throwing `QuotaExceededError` returns `"unavailable"` and the in-memory profile still updates.
- [ ] Test: an invalid setting falls back to its default without discarding the rest; unknown keys and `__proto__` payloads are never copied into the profile (the per-setting cases arrive with their settings, see Interfaces).
- [ ] Test (S5): a saved language wins over the browser's; unreadable data shows the "started fresh" notice and leaves a copy; a newer version's data is reported and untouched; blocked storage shows the "can't be saved" notice and the app still works; the notice sits above `main`, is not in the served HTML, stays across pages until dismissed and then stays away, with focus moved to `main`; Arabic notices; the old version's key is neither used nor touched.
- [ ] Implement; a banner (`role="status"`) in the shell shows when the notice is non-null. Gate, review, commit.

### Task 8: Typing surface, trainer hook and Custom mode (the first vertical slice)

**Files:** Create `src/typing/{TypingSurface.tsx,highlights.ts,useCursorRect.ts,useTrainer.ts}`, `src/custom/CustomPage.tsx`, `e2e/{custom.spec.ts,typing.spec.ts,shaping.spec.ts,helpers/type.ts}`.

**Interfaces:**
- Consumes: Tasks 4 to 7.
- Produces: `useTypingInput(options: { active: boolean; label: string; onKey(key: Key, at: number): void; onLatin(): void; onNavigate?(direction: 1 | -1): void }): { inputProps; focus(): void; focused: boolean; shiftHeld: boolean }`, which keeps the field's value at the placeholder, feeds `diffInput` on every `input` event following the Task 6 contract (holding the value still during a composition and resetting it at `compositionend`, ignoring forward deletes), calls `onLatin` when `wrongLayout` is set, resets the caret on `selectionchange`, and tracks Shift and PageUp/PageDown with `keydown`; the field carries `autocomplete=off autocorrect=off autocapitalize=off spellcheck=false inputmode=text lang=ar dir=rtl` and a 16 px font (M6).
- Produces: `useTrainer(config: { prompt: Prompt | null; origin?: number; options: SessionOptions; active: boolean; onCheckpoint?(samples: readonly Sample[], cursor: number): void; onComplete(result: { metrics: ReturnType<typeof metricsOf>; samples: readonly Sample[] }): void }): { session: Session | null; focused: boolean; latinDetected: boolean; surfaceProps: ...; restart(): void }`; `<TypingSurface session paused lang font fontSize onActivate />`; `typeText(page, text, opts?: { mistakesAt?: Record<number, string>; delayMs?: number })` e2e helper that dispatches `insertText` per unit.
- DOM contract: the surface is a labelled `section` (`lang="ar" dir="rtl"`) with one `<p>` per block (`prompt.breaks`), a single text node per block while no mistakes are pending; mistakes render in an `aria-hidden` `inline-block` span (`unicode-bidi: isolate; white-space: pre`, a space shown as `␣`); highlights `mafatih-done`, `mafatih-mistake`, `mafatih-apparatus` (skipped untypeable characters) are `Range`s registered on `CSS.highlights`; the caret is an `aria-hidden` 2 px bar placed from the start edge of a `Range` over the next display character and scrolled into view (instantly under reduced motion).

- [ ] Test (S1): `prepareCustomText(raw: string): string` (in `src/custom/text.ts`) collapses whitespace (`" a\n\n b "` gives `"a b"`), expands lam-alef presentation forms and puts marks in canonical order; an empty `buildPrompt(...).units` drives the Custom empty states: empty, whitespace only, Latin only and marks only all produce the inline message "There is nothing to type in this text" (en and ar keys), never an empty lesson (Review Focus 4); more than 5,000 characters is truncated at a word boundary with a notice.
- [ ] Test (S5): pasting `بِسْمِ` with vocalization `letters` shows the full text (marks drawn), the caret skips the marks, and typing the four letters completes it; with `full`, marks are required; typing shadda and vowel in either order is accepted.
- [ ] Test (S5): requireBackspace ON: typing `س` where `ب` is expected shows `س` at the cursor, the expected text is still fully visible after it, three wrong keys then three Backspaces restore the original `textContent`; completed text cannot be deleted. OFF: the wrong key shows nothing, the surface gets `data-error` for 300 ms and the status region says "Mistake" once.
- [ ] Test (S5, chromium, Review Focus 2): `page.keyboard.insertText("ب")` and `press("Backspace")` reach the engine (including Backspace right after load, thanks to the sentinel); a CDP `Input.imeSetComposition` that builds a word letter by letter yields exactly one key per letter; pasting a sentence types nothing; Tab leaves the input (A3).
- [ ] Test (S5, Review Focus 2 and 5): Latin keys show the layout banner (`role="alert"`) and insert nothing; blurring the input shows a "Tap to continue typing" `<button>` and pauses; a 10-minute blur does not affect speed.
- [ ] Test (S5, shaping, Q1): for each of the three fonts, a screenshot of the surface with the cursor mid-word is pixel-identical (zero diff) to a reference rendering of the same text with `CSS.highlights` cleared; if this fails the fallback is per-segment spans (done, rest) and the plan is amended before continuing.
- [ ] Test (S5): at 320 px and with the viewport height cut to 300 px (keyboard open) the caret line is visible and there is no horizontal scroll (M3, M8); axe clean; in a browser without `CSS.highlights` (delete it in an init script) typing, caret and mistakes still work.
- [ ] Implement `useTrainer` to be reused by Practice and Recitation: it owns the session, wires `useTypingInput`, pauses on blur and on `visibilitychange`, fires `onCheckpoint` with new samples when the cursor moves and `onComplete` once. Custom page: empty state with a labelled `<textarea>` and Start; typing state with an Edit text dialog; completion summary with Type again and Edit text.
- [ ] Gate, review, commit.

### Task 9: Settings dialog and guide keyboard

**Files:** Create `src/settings/SettingsDialog.tsx`, `src/keyboard/GuideKeyboard.tsx`, `e2e/settings.spec.ts`.

**Interfaces:**
- Consumes: `Dialog`, `SegmentedControl`, `Switch` (Task 2), `useProfile` (Task 7), `strokeFor`, `fingerOf` (Task 3).
- Produces: `<SettingsDialog open onClose onOpenTransfer />`; `<GuideKeyboard next: string | undefined shiftHeld: boolean fingerColours: boolean />`.

- [ ] Test (S4): the dialog is named "Settings"; groups are `fieldset`/`legend`: Language (English, العربية with their own `lang`), Vocalization (Auto, Letters only, Harakat, Full, each with a one-line description via `aria-describedby`), "Correct mistakes with Backspace" switch (on by default), Font (each option previews a vocalized sample), Font size (range with `aria-valuetext`), Show keyboard guide, Finger colours, Backup and restore, Reset progress (confirm step).
- [ ] Test (S5): changing language flips `html[lang][dir]` without resetting the current session; changing vocalization or the Backspace setting starts a fresh lesson of the same prompt; all settings survive a reload; font choice applies only to the lesson text.
- [ ] Test (S1/S4): `GuideKeyboard` highlights the key for the next unit, adds the Shift key when `strokeFor(next).shift`, highlights the ligature key for a `"لا"` unit, is `aria-hidden`, always `dir="ltr"`, and is absent below `md` or on coarse pointers (assumption A3).
- [ ] Implement as a bottom sheet below `md`. Gate, review, commit.

### Task 10: Practice corpus pipeline and review gate

**Files:** Create `scripts/{extract-words.ts,build-data.ts}`, `scripts/lib/{wiktionary.ts,practice-rules.ts}`, `data/practice/{words.tsv,blocklist.txt,reject.txt,SOURCES.md}`, `src/practice/words.ts`, tests.

**Interfaces:**
- Consumes: `isFullyVocalized`, `skeleton`, `canonicalizeMarks` (Task 4), `isTypeable` (Task 3).
- Produces: `interface PracticeWord { text: string; rank: number }`; `interface WordList { words: readonly PracticeWord[]; bySkeleton: ReadonlyMap<string, readonly PracticeWord[]> }`; `loadWords(): Promise<WordList>` (lazy chunk, only Practice imports it); `extractWords(entries: Iterable<WiktionaryEntry>, ranks: ReadonlyMap<string, number>, rules: Rules): readonly { word: string; rank: number; pos: string }[]`.
- Data files: `words.tsv` is `word<TAB>rank<TAB>pos`; `blocklist.txt` holds unvocalized skeletons, one per line (sections separated by blank lines: divine names used only for Allah, Qur'an terms, prophets and angels); `reject.txt` holds exact vocalized words removed after human review.
- Sources (download into a **new empty scratch directory**, never into the repo, and pass paths as arguments): `https://kaikki.org/dictionary/Arabic/kaikki.org-dictionary-Arabic.jsonl.gz` and `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ar/ar_50k.txt`. Stream the dump with `zlib` and `readline`; never load it whole.

- [ ] Test (S1, on tiny fixtures): a noun entry yields its three indefinite tanween forms (nominative, accusative, genitive) and no definite or construct forms; a verb yields third person masculine singular past and non-past; particles keep their canonical form; an entry whose only senses are tagged obsolete, archaic, rare, dated, dialectal, vulgar, offensive, slang or `form-of` yields nothing; proper nouns are dropped; a form containing `ٰ` or any untypeable character is dropped; a pausal form (bare final letter) is dropped; a vowel-before-shadda form comes out shadda-first; at most 6 forms per headword; `reject.txt` words are removed.
- [ ] Test (S1): the blocklist removes `الله`, `رب`, `قرآن`, `آية`, `سورة`, `نبي`, `رسول` and a prophet's name in **every** vocalization, matching by skeleton.
- [ ] Test (S2, against the real committed data via `build:data`): every word `isFullyVocalized`, typeable, shadda-first; no blocklisted skeleton; at most 12,000 words and at most 300 KB raw; for the ten starter letters at least 60 distinct letters-only skeletons and at least 60 distinct vocalized words, each starter letter in at least 8 words; each of the 8 marks occurs in at least 50 words; **every word has at least one typeable mark, so the Full level always differs from Letters only**.
- [ ] Run the extraction once; print a report: counts per step, the first 400 words reachable with the ten starter letters, 100 random other words, the blocklist hits.
- [ ] **Human gate:** the owner (a native reader) reviews the report and `blocklist.txt`, adds entries to `reject.txt` and `blocklist.txt`, and confirms the Share-Alike consequence of the committed word list. Do not start Task 12 until the owner has signed off.
- [ ] Gate, review, commit.

### Task 11: Key stats and the unlock ladder (pure)

**Files:** Create `src/stats/keystats.ts`, `src/practice/ladder.ts`, tests. Read `git show origin/main:src/engine/stats/{keystats,unlock}.ts` and their tests as a behavioural reference.

**Interfaces:**
- Consumes: `Sample` (Task 5), `HOME_ROW_LETTERS`, `reachOf`, `TYPEABLE_LETTERS`, `MARKS` (Task 3).
- Produces: `interface KeyStat { char: string; attempts: number; hits: number; timed: number; meanMs: number; recentAccuracy: number }`; `type KeyStats = Readonly<Record<string, KeyStat>>` (null-prototype safe); `recordSample(stats: KeyStats, sample: Sample): KeyStats`; `sanitizeStats(raw: unknown): KeyStats` (at most 200 keys, keys are one character or one ligature pair); `type Rung = { kind: "letter" | "mark"; char: string }`; `interface Ladder { rungs: readonly Rung[]; starter: number }`; `buildLadder(wordFreq: ReadonlyMap<string, number>): Ladder`; `interface LadderProgress { unlocked: number }`; `initialProgress(ladder: Ladder): LadderProgress`; `unlockedLetters(ladder, progress): ReadonlySet<string>`; `unlockedMarks(ladder, progress): ReadonlySet<string>`; `focusRung(ladder, progress): Rung | undefined`; `interface UnlockConfig { minSamples: number; letterMs: number; markMs: number; minAccuracy: number }`; `DEFAULT_UNLOCK_CONFIG` (8, 700, 1000, 0.95); `advance(stats: KeyStats, ladder: Ladder, progress: LadderProgress, config: UnlockConfig): LadderProgress`; `sanitizeProgress(raw: unknown, ladder: Ladder): LadderProgress`.

- [ ] Test: a first-try hit adds a timed latency sample; a miss adds an attempt and no latency; `recentAccuracy` is the exact mean over the first 20 attempts then a moving average with rate `max(0.05, 1/(attempts+1))`.
- [ ] Test: `buildLadder` has 44 rungs (36 letters then 8 marks); the first 10 are exactly `HOME_ROW_LETTERS` ordered by frequency; `ط` is not among them; letters after the starter are sorted by `frequency x e^(-reach)`; marks end the ladder in the order fatha, kasra, damma, sukun, shadda, fathatan, kasratan, dammatan; `starter === 10`.
- [ ] Test: `initialProgress` unlocks the 10 starter letters and no marks; `focusRung` is the newest unlocked rung; `advance` unlocks one rung only when the focus rung has `minSamples` timed samples, mean at most its threshold (700 ms letters, 1000 ms marks) and recent accuracy at least 0.95; it never advances twice in one call and never past the last rung.
- [ ] Test: `sanitizeProgress` clamps to `[starter, rungs.length]`; `sanitizeStats` drops a `__proto__` key and entries with negative counts.
- [ ] Test (S2, in `build:data`, real data): with the real ladder built from the committed word list, for every letter rung at least 10 distinct skeletons contain that letter and only letters of earlier rungs, so every rung can be drilled.
- [ ] Implement; extend the profile with `ladder` and `stats: Record<Mode, KeyStats>` plus their round-trip tests (Task 7 contract). Gate, review, commit.

### Task 12: Practice lessons and the Practice page

**Files:** Create `src/practice/{lesson.ts,PracticePage.tsx,Hud.tsx}`, `e2e/practice.spec.ts`, `src/practice/boundary.test.ts`.

**Interfaces:**
- Consumes: `WordList` (Task 10), `Ladder`, `LadderProgress` and helpers (Task 11), `buildPrompt`, `requiredMarks` (Task 4), `useTrainer` (Task 8).
- Produces: `interface PracticeOptions { words: WordList; ladder: Ladder; progress: LadderProgress; vocalization: Vocalization; seed: number; targetChars?: number }`; `buildPracticeLesson(options: PracticeOptions): Prompt`; `createRng(seed: number)` with `next(): number` and `weighted<T>(items: readonly T[], weight: (t: T) => number): T`.
- Selection rule: choose a skeleton by weight `1 + ln(1 + frequencyScore)`, multiplied by 6 when it contains the focus letter (or when the focus rung is a mark and the word contains it), then pick one vocalized form of that skeleton uniformly; never the same typed string more than twice per lesson or twice in a row; target 38 typed characters.

- [ ] Test (S1): for 200 seeds and several progress values, every word's skeleton letters are a subset of `unlockedLetters`; `buildPracticeLesson` for `initialProgress` never throws and its typed text uses only home-row letters (**a fresh user can practise immediately**).
- [ ] Test: same seed gives the same lesson; over 500 seeds at least 40% of lessons contain the focus letter; with `letters` vocalization the typed text of a lesson differs from its `full` typed text and every shown word is `isFullyVocalized` (marks are drawn but not typed); with `auto` and only fatha unlocked, exactly fatha is typed.
- [ ] Test (S1): simulated learners through the real generator, session and `advance`: a seeded learner with 3% errors and 500 ms latency climbs to at least 20 rungs within 300 lessons; one with 20% errors does not leave the starter set within 100 lessons.
- [ ] Test (boundary): no file under `src/practice/` imports from `src/recitation/` or `generated/quran` (read the sources and assert), enforcing Q2.
- [ ] Test (S5): on a cleared profile, Practice shows a lesson at once with at least 3 words, all home-row letters, marks visible; typing it correctly completes it and the next lesson is already on screen with a `last` readout; with a profile seeded one sample short of mastery, one clean lesson unlocks the next rung, announced once in the polite status ("Unlocked: ك"), no animation burst; the HUD shows `unlocked 11 / 44`, the focus rung with its accuracy and latency; Practice typing never changes `stats.recitation`; at `unlocked === 44` the HUD says all keys are unlocked.
- [ ] Test (S5): after a Practice lesson, stats go into `stats.practice` and `advance` runs; after a Recitation lesson (Task 14) `ladder` is unchanged.
- [ ] Implement; the page subtitle says Practice uses everyday words, not the Qur'an. A11y and mobile per the contracts (compact HUD below `sm`). Gate, review, commit.

### Task 13: Qur'an data and the recitation domain (pure)

**Files:** Extend `scripts/build-data.ts`; create `src/recitation/{quran.ts,passage.ts,progress.ts,order.ts}` and tests. Read `git show origin/main:src/engine/{recitation,lessons}/*.ts` and their tests as a behavioural reference.

**Interfaces:**
- Produces: `generated/quran/NNN.json` per surah (gitignored, lazily chunked with `import.meta.glob`); `loadSurah(n: number): Promise<Surah>` where `interface Surah { number: number; ayat: readonly string[]; basmala: string | null }`; `surahMeta(n): { n; name; tname; ename; ayat: number; type }`; `interface Passage { prompt: Prompt; surah: number; fromAyah: number; toAyah: number; ayat: readonly { ayah: number; start: number; end: number }[]; basmala: { start: number; end: number } | null }`; `buildPassage(surah: Surah, fromAyah: number, maxAyat: number, required: ReadonlySet<string>): Passage`; `interface RecitationProgress { position: { surah: number; ayah: number }; surahs: Readonly<Record<number, SurahProgress>> }`; `recordAyat(progress, update): { progress: RecitationProgress; completion: SurahCompletion | null }`; `passageAfter`, `passageBefore`, `resumeOf`, `completedSurahs`, `surahOrder(order: "mushaf" | "juz-amma"): readonly number[]` (Juz ʿAmma is 114 down to 78, then 1 to 77); `sanitizeRecitation`.
- The Tanzil text prepends the basmala to ayah 1 of every surah except 1 and 9; it is lifted out as its own centred block (a hard `break` after it) so that every ayah span equals exactly one audio file. Ayah end signs (`۝` plus Arabic-Indic digits) are appended to `shown` as skipped text.

- [ ] Test (S2/Q1): for all 114 surahs, re-joining `basmala` and `ayat` reproduces the source lines exactly; the dagger alef count over all passages is 3,330; 6,236 ayat and 114 surahs asserted at build time; `build:data` fails if any ayah changed.
- [ ] Test (S1): `2:1` is `"الم"` with the basmala lifted and equal to the `1:1` text; surah 1 lifts nothing; surah 9 has no basmala; passages hold whole ayat only; `maxAyat: 1` on `2:282` works.
- [ ] Test (S1): `recordAyat` is idempotent per ayah, emits a completion exactly once when every ayah is typed, the position resumes after the last typed ayah, `passageBefore` crosses into the previous surah, `surahOrder("juz-amma")` starts `[114, 113, ... 78, 1, 2, ...]` and has 114 unique entries.
- [ ] Extend the profile with `recitation` and its round-trip test. Gate, review, commit.

### Task 14: Recitation page (the default mode)

**Files:** Create `src/recitation/{RecitationPage.tsx,SurahMap.tsx,PassageBar.tsx,RecitationSettings.tsx,useRecitation.ts}`, `e2e/recitation.spec.ts`.

**Interfaces:**
- Consumes: Tasks 8, 9, 13, 7.
- Produces: `<RecitationPage route />`; at `#/` the surah map, at `#/recitation/36/21` that passage (Ya-Sin from ayah 21, `#/recitation/36` resumes).

- [ ] Test (S5): `#/` shows 114 surah links in a list; each has an accessible name such as "Ya-Sin, 12 of 83 ayat typed" and a visible progress ring plus a text mark for done (not colour alone, A6); the order setting switches Mushaf and Juz ʿAmma; in the Arabic UI only Arabic names show.
- [ ] Test (S5): a fresh user opens a surah and types it; progress is saved ayah by ayah (reload resumes after the last finished ayah); the address follows the passage with `replaceState`; the basmala is a centred block of its own; ayah signs are tinted by the apparatus highlight and never typed; the full text, dagger alef included, is on screen at every vocalization level (Q1); typing `letters` only completes the surah.
- [ ] Test (S5): a finished passage shows an inline "Completed" region with Type again and Next passage, and keystrokes are ignored until one is chosen; previous and next buttons and PageUp/PageDown cross surah boundaries; "Go to ayah" is a labelled number field plus a `<progress>` with text "12 of 83".
- [ ] Test (S5): completing a surah moves focus to a quiet panel (`tabindex="-1"` heading) with name, ayat, accuracy, speed, time and Next surah or Type again; no confetti, no sound, no modal (Q3).
- [ ] Test (S5, Review Focus 4): `2:282` with `ayatPerLesson = 1` renders, scrolls the caret line into view and completes; the median keystroke-to-paint time stays under 50 ms with 4x CPU throttling on `chromium-mobile`.
- [ ] Test (S5): recitation typing writes `stats.recitation` and leaves `ladder` unchanged (D4); all letters are typeable regardless of unlocks.
- [ ] Implement with the Recitation settings dialog (ayat per passage 1, 2, 3, 4, 5, 6, 8, 10, 15, 20; map order). Gate, review, commit.

### Task 15: Recitation audio

**Files:** Create `src/recitation/audio/{reciters.ts,cache.ts,usePlayer.ts,Player.tsx}`, `e2e/audio.spec.ts`, `e2e/fixtures/{ayah.mp3,ayah-long.mp3}` (from `git show origin/main:cypress/fixtures/...`). Read `git show origin/main:src/engine/audio/reciters.ts`, `src/hooks/useRecitationPlayer.ts`, `src/storage/audio-cache.ts` as the behavioural reference.

**Interfaces:**
- Produces: `RECITERS` (`murattal` = `Abdul_Basit_Murattal_64kbps` default, `mujawwad` = `Abdul_Basit_Mujawwad_128kbps`); `ayahAudioUrl(id: ReciterId, surah: number, ayah: number): string` (`https://everyayah.com/data/<folder>/<SSS><AAA>.mp3`); `audioSequence(passage: Passage): readonly { surah: number; ayah: number; span: { start: number; end: number } }[]` (the basmala clip is `001001`, surah 9 has none, surah 1 ayah 1 is its own basmala); `createAudioCache(): AudioCache | null` (IndexedDB `mafatih.audio`, blobs keyed by URL, `get`, `put`, `usage`, `clear`); `<Player passage held />`.

- [ ] Test (S1): the URL table (`1:1` is `001001.mp3`, `114:6` is `114006.mp3`); `audioSequence` for `2:1-3` starts with the `001001` clip; for surah 9 it has no basmala clip; the previous action restarts the ayah after more than 2 s, otherwise steps back; the player state machine (pure reducer) never plays while `held` (dialog open, completed passage, surah panel).
- [ ] Test (S5, routes mocked with the fixture): transport buttons have names and no `aria-pressed` on play/pause (the label toggles), mute is a toggle with `aria-pressed`, volume has `aria-valuetext`, "Play whole passage" is a switch; the status line "Abdul Basit ʿAbd us-Samad · Murattal 64 kbps · 2:1" is polite and updates per ayah only; the playing ayah gets the `mafatih-playing` highlight (colour plus background); typing never starts audio and audio never moves the cursor (Q5); a failed fetch shows "Recitation unavailable" and the lesson stays typeable (Q6); each ayah is fetched once (second play hits the cache); the cache size is shown and Delete empties it; finishing a passage while playing carries on into the next one.
- [ ] Test (S5): after pressing a control on a fine pointer the typing input regains focus; on coarse pointers it does not (so the phone keyboard does not pop up unasked).
- [ ] Implement `MediaSession` metadata and the CSP additions (`media-src blob: https://everyayah.com`, `connect-src` the same). Gate, review, commit.

### Task 16: Stats page

**Files:** Create `src/stats/StatsPage.tsx`, `e2e/stats.spec.ts`.

**Interfaces:** Consumes `KeyStats` (Task 11), history (Task 7). Produces `<StatsPage />`.

- [ ] Test (S4): a native radio group (Practice, Recitation, Custom) chooses the mode; the empty state explains what to do; a `<table>` with `<caption>` lists keys with columns Key, Speed (ms), Accuracy, Attempts; marks are shown on a dotted circle so they render alone; numbers use `formatNumber`; the last ten lessons are listed with mode, speed, accuracy.
- [ ] Test (S5): axe clean in `en` and `ar`, light and dark, desktop and mobile; the bars are `aria-hidden` and the table carries the information (A6).
- [ ] Implement. Gate, review, commit.

### Task 17: Backup and restore

**Files:** Create `src/storage/{transfer.ts,TransferDialog.tsx}`, `e2e/transfer.spec.ts`.

**Interfaces:**
- Produces: `exportProfile(profile: Profile, now: Date): { filename: string; json: string }` (`mafatih-backup-YYYY-MM-DD.json`, envelope `{ app: "mafatih", schema: 2, exportedAt, profile }`); `importProfile(text: string): { ok: true; profile: Profile } | { ok: false; reason: "too-large" | "not-json" | "not-a-backup" | "wrong-version" }`; `MAX_IMPORT_BYTES = 2_000_000`.

- [ ] Test (S3): round-trip; a 5 MB text is `too-large`; a v1 export or any other `schema` is `wrong-version`; `__proto__` keys, wrong types, huge arrays are neutralised by the sanitizers (history at most 100, stats keys at most 200).
- [ ] Test (S5): export downloads a file with the expected name and contents; import through the file input shows a confirm step ("Replace your current progress?") then applies and announces success in the status region; each failure reason shows a distinct `role="alert"` message tied to the field; mobile bottom sheet; axe clean.
- [ ] Implement. Gate, review, commit.

### Task 18: About, SEO, security headers and deploy

**Files:** Create `src/app/AboutPage.tsx`, `e2e/about.spec.ts`; modify `vite.config.ts`, `index.html`, `.github/workflows/deploy.yml`, `public/site.webmanifest`. Port `seo()` (robots, sitemap, `SITE_URL`, `BASE_PATH`) and `contentSecurityPolicy()` from `git show origin/main:vite.config.ts`.

- [ ] Test (S2): the built `index.html` has the CSP meta with exactly `default-src 'self'`, `script-src 'self'`, `media-src 'self' blob: https://everyayah.com`, `connect-src 'self' https://everyayah.com`, `object-src 'none'`, `base-uri 'self'`, `form-action 'none'` and no inline script; `robots.txt` and `sitemap.xml` are emitted; the viewport meta equals the Mobile contract M2 string; the manifest and icons resolve.
- [ ] Test (S5): About has Privacy (no cookies or analytics, local storage and IndexedDB, the only third-party request is the audio) and Credits (Tanzil with its link, EveryAyah, Wiktionary via kaikki.org with the dump date and CC BY-SA 4.0, FrequencyWords with CC BY-SA 4.0, fonts, the Microsoft layout reference), a statement that Practice uses everyday words and the Qur'an is only ever shown whole and in order, and the "mostly AI generated" notice; all external links have `rel="noopener noreferrer"`; both languages; axe clean.
- [ ] Test (S4): `ErrorBoundary` renders Reload and Start over for a throwing child and Start over clears `STORAGE_KEY`.
- [ ] Deploy workflow runs `pnpm verify` before building and deploys only `main`. Gate, review, commit.

### Task 19: Hardening and the QA matrix

**Files:** Create `e2e/{a11y-matrix.spec.ts,keyboard-walk.spec.ts,aria-snapshots.spec.ts,perf.spec.ts}`, `scripts/check-size.ts`, `docs/QA-DEVICES.md`.

- [ ] Test (S5): axe on every route and dialog across language, scheme and viewport; a Tab-only walk of every page asserts reachable controls, visible focus and no trap; ARIA snapshots (`toMatchAriaSnapshot`) for every page in `en` and `ar` are committed as regression baselines; reduced motion disables the caret scroll animation; 200% zoom and 320 px lose nothing.
- [ ] Test (S2): `check-size` fails the build when the entry chunk exceeds 130 KB gzip, any surah chunk exceeds 80 KB gzip, or the practice list exceeds 100 KB gzip, and checks that Practice words are not in the entry chunk.
- [ ] Add the `firefox`, `webkit` and `webkit-mobile` (iPhone) Playwright projects behind `PW_FULL=1` plus a CI step that installs them and runs the matrix; fix engine differences, especially CSS Highlight rendering and Arabic shaping.
- [ ] Whole-codebase `laws-of-simplicity` pass: remove dead code, collapse anything speculative, compare line counts with `origin/main`, record the deltas in the commit message.
- [ ] Arabic copy review: the owner reviews `src/i18n/ar.ts` as a native reader; record corrections.
- [ ] `docs/QA-DEVICES.md` is the manual checklist the owner runs on physical devices before cut-over: iOS Safari (Arabic keyboard, Backspace on empty, harakat by long-press, keyboard open in portrait and landscape), Android Chrome with Gboard (composition, swipe typing ignored), iPad with a hardware keyboard, Windows Arabic (101) including the lam-alef key, Linux `setxkbmap ara`, and each result recorded.
- [ ] Gate, review, commit.

### Task 20: Documentation and cut-over

**Files:** Rewrite `README.md`, create `docs/TECHNICAL.md` (at most 300 lines: how it works, the rules in Global Constraints, commands, layout, data pipeline and licences), update the plan with anything learned.

- [ ] Verify from a clean clone: `pnpm install && pnpm verify` is green and `pnpm build:data` reproduces `generated/` exactly.
- [ ] Stop and report to the owner with the QA results. **Only when the owner asks:** open a pull request from `claude/clever-thompson-ohqxvp` into `main` using the repository's template if one exists, then (with the owner's approval) tag the old head `v1-legacy`, merge, and watch the Pages deployment. The old `mafatih.profile` key is left untouched in users' browsers.
- [ ] Review, commit.

---

## Out of scope (can follow later)

PWA and offline use, an in-app touch keyboard for phones, more reciters, a manual theme switch, a "skip ahead" that unlocks all letters, word-level Practice for Quran vocabulary (deliberately not planned: see Q2).

## Open items for the owner

1. Confirm assumptions A1 to A13 (especially A1 starter set, A3 phone keyboard approach, A5 no confetti).
2. Task 10 needs your native-reader sign-off on `blocklist.txt` and the starter words, and your decision on the Share-Alike licence of the word list.
3. Task 19 needs you to review the Arabic UI copy and run the device checklist.
