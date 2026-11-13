# Focus Redesign Implementation Plan

> **For agentic workers:** REQUIRED SKILLS, invoked with the Skill tool at the start of every task and kept in force for the whole task: **`tdd`** and **`laws-of-simplicity`**. Execute task by task with the **Task loop** below. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the current look of Mafatih with the "Focus" design the owner chose in four mockup rounds: dark only, passage first, almost no chrome, one amber accent. Along the way: remove the "Start typing" pill and the finger-zone colours, make Scheherazade New the default lesson font, bring back the old app's surah-complete celebration and star system, redesign the audio controls (keeping the old player's repeat toggle), trim two sections from the About page, and bring the search and social images and the favicons in line with the new look.

**Architecture:** No engine rewrite. The typing engine, the CSS Custom Highlight API painting, storage, i18n and routing stay. Work is (1) a new design-token layer, (2) a restyled shell and UI primitives, (3) the typing surface and guide keyboard without a pill and without tints, (4) one small data addition (best accuracy per surah) that powers stars, (5) a new surah-complete dialog, (6) the remaining pages restyled, (7) tests and docs updated to match.

**Tech Stack:** unchanged: React 19, Vite, TypeScript strict (no `any`), Tailwind 4, Biome, pnpm, Vitest, Playwright + axe.

**Reference design:** the approved mockups are committed in `docs/design/focus/` and are the source of truth for how it must look. Read them before every UI task.

| File | Shows |
|---|---|
| `typing-desktop.png` | Typing screen, 1440 px, English UI |
| `typing-desktop-rtl.png` | Same screen with the Arabic UI (mirrored; the keyboard stays left to right) |
| `screens-desktop.png` | Recitation home, Practice, Stats, Custom, Settings, passage finished |
| `celebration-frames.png` | Surah-complete card at 0.0, 0.25, 0.5, 0.8, 1.3 and 2.0 s |
| `mobile-typing-home.png` | Phone: typing before the first tap, typing with the phone keyboard up, Recitation list |
| `mobile-celebration-settings.png` | Phone: surah complete and Settings as bottom sheets |

---

## Decisions (settled by the owner)

| # | Decision | Detail |
|---|---|---|
| D1 | Base design is "Focus" (design 3) | Passage first, centred text, no box around it, nav as plain text, keyboard drawn as outlines |
| D2 | Dark only | No light theme. `prefers-color-scheme` is ignored; the page is always dark |
| D3 | Background | `#08090b` |
| D4 | Untyped text is darker than anything shown so far | `#5b5d61`, about 3.0 : 1 on the background (see Waivers) |
| D5 | Next-key marker is the "halo" style, in amber | No finger-zone colours at all. The finger caption under the keyboard stays (setting "Show which finger to use" now controls only the caption) |
| D6 | Fonts | All three kept (Scheherazade New, Amiri, Noto Naskh Arabic). **Scheherazade New is the default value of the lesson font setting**, changeable in Settings as today. **The setting changes the lesson text only** (Recitation, Practice and Custom lessons). The guide keyboard and every other piece of text ignore it and use a fixed interface font: Noto Naskh Arabic for Arabic (wordmark, keyboard letters, surah names, Arabic interface text) and the system font for Latin. A reader who wants one font everywhere sets the lesson font to match |
| D7 | The "Start typing" pill is removed | Tap or click the text to start, or Tab to it. While it waits, the amber caret blinks at the first letter and the next key glows. No hint text, no auto-focus (Custom's form button labelled "Start typing" stays: it is a form submit, not the pill) |
| D8 | Mobile is looser | No "12 of 83 ayat" line on phones. Top bar is the wordmark and a settings icon; the four pages sit in a bottom tab bar that is hidden while the phone keyboard is up; one row of icon controls; no empty progress bars in the list |
| D9 | Surah-complete celebration and the star system return | Behaviour and timings of the old app (`git show origin/main:src/components/SurahComplete.tsx`, `src/styles/globals.css`), colours restricted to amber. **The rays keep bursting until the card is closed** (the old app stopped after two bursts). Star = a surah completed with 95% accuracy or better |
| D10 | About page loses two sections | "How this site was made" and the "Source code" credit (label, note and GitHub link) |
| D11 | About link moves into Settings | Footer is removed. A link at the bottom of the Settings dialog opens the existing About page |
| D12 | Verification | Unit tests, typecheck and lint on every step; Playwright on the specs a task changes; the full gate (`pnpm verify`) once at the end, with ARIA baselines regenerated |
| D13 | Answers at checkpoint C1 | The wordmark uses the fixed interface font (Noto Naskh Arabic), not the lesson font. **No focus ring around the typing text** (the caret is the cue: it blinks while the text waits and stands still while typing). The waiting caret is calmer: a 2.4 s soft fade instead of a hard 1.2 s blink |
| D14 | Audio controls are redesigned | The owner dislikes the current controls. Before any other remaining task, a showcase round of very different directions (Task A1), then a second round that improves the pick. The build is part of Task F11 |
| D15 | The old player's repeat toggle returns | A "Repeat passage" toggle (see Task A1 for its exact behaviour, taken from the old app). Remembered in the profile like the other audio settings |
| D16 | Search and social images and favicons get a light touch | Not a redesign. Keep the old composition, which the owner liked, and make the colours, key style and amber accent coherent with Focus (Task F13b) |
| D17 | A passage holds at most four ayat | The `Ayat per passage` setting is 1 to 4 (default 4). Nobody wants more on screen, and the audio position display needs a bounded, predictable number of stops. A saved value above 4 is read as 4. Done (2026-11-13) |
| D18 | No underline on the ayah being recited | The wash stays, the 2 px underline is gone (`::highlight(mafatih-playing)`). The wavy underline under wrong letters stays: it is the non-colour cue for mistakes (A6). Done (2026-11-13) |
| D19 | Audio controls shortlist (round 1, 2026-11-13) | The owner likes the Dial most and the Ayah Ruler next, and especially the ruler's volume panel. The dial's arcs are not clickable (previous and next are enough). Both designs show one stop per ayah, at most five (the basmala is a stop of its own, then up to four ayat). Round 2 shows the Dial's volume control and the long and short ayah cases |
| D20 | **Audio controls decided (round 2, 2026-11-13): the Dial** | Mockups: `audio-dial-desktop.png`, `audio-dial-phone.png`, `audio-long-short-cases.png`. The speaker opens an **Audio panel** (a floating panel above the control, not the row-in-place alternative) with volume, mute, "Play whole passage" and the reciter line. Arc sizes are **proportional to each stop's word count with a minimum arc**. The arcs are display only. **The surah name is not repeated in the audio controls**: it appears once, above the lesson text. The caption under the dial says only `Ayah 14 · 2 of 4` (`Basmala · 1 of 5` on the basmala stop) |
| D21 | **The audio controls are bare** (owner, 2026-11-13) | No caption under the dial (no "Listen", no "Ayah 13 · 1 of 4"), no "Previous passage" and "Next passage" buttons and no `#` Go to ayah button or panel. The footer is the thin rail, the quiet "12 of 83 ayat typed" text (screen-reader text on phones) and the dial row. Moving between passages is Page Down and Page Up with focus in the footer, the summary's Next button after finishing, and the surah list. Go to ayah was removed with its tests and strings (it is in the git history, commit 0e49c34) |

## Superseded rules and waivers (record these in `docs/TECHNICAL.md` in Task F1)

- **A5 (contrast) waiver, owner, 2026-11-12:** the untyped lesson text (`--color-upcoming`) is about 3.0 : 1, below the 4.5 : 1 text rule. Everything else keeps 4.5 : 1 (text) and 3 : 1 (UI). The token test guards a 3.0 : 1 floor so it cannot get darker by accident, and axe's `color-contrast` rule excludes the lesson text only.
- **A5 "light and dark" becomes dark only.** Light-scheme e2e variants are deleted, not skipped.
- **Q3 (no celebration or scoring on Qur'an content) is reversed by the owner for surah completion only.** Amber rays, a glowing name and a star. Still no sound, no emoji, no confetti, nothing shown while typing, and `prefers-reduced-motion` gets a static card.
- **A4 (visible focus indicator) waiver for the typing text, owner, 2026-11-13:** no ring is drawn around the typing text when it is reached with Tab. The caret is the focus cue (it blinks while the text waits and stands still while typing). Every other control keeps the 2 px focus ring. The `data-modality` flag and its tracker were removed.
- **Arabic copy for the new strings is not human verified**, like the rest of the Arabic copy (the existing note in README and About stands).

## Design tokens (final)

| Token | Value | Use |
|---|---|---|
| `page` | `#08090b` | Background |
| `surface` | `#101114` | Dialogs, cards, sheets |
| `ink` | `#ebe8e2` | Typed text, headings, active nav |
| `muted` | `#8f9299` | Labels, inactive nav, captions (6.4 : 1) |
| `upcoming` | `#5b5d61` | Untyped lesson text (waiver above) |
| `apparatus` | `#8f9299` | Marks that are shown but skipped |
| `line` | `#23262b` | Decorative hairlines, key outlines, text-button outlines |
| `edge` | `#6b6f77` | Outline of controls that are identified only by it: inputs, textarea, radio, switch track, slider track (at least 3 : 1) |
| `faint` | `#14161a` | Progress rails, tab bar top rule |
| `accent` | `#e2b062` | Caret, next key, primary action, progress, star |
| `on-accent` | `#1a1408` | Text on solid amber |
| `danger` | `#fca5a5` | Mistakes, errors |
| `focus` | `#93c5fd` | Focus ring |

Removed: every light value, the `@media (prefers-color-scheme: dark)` block, the four `finger-*` tokens. Utilities (in `globals.css`): `halo` (amber wash 14%, amber border 80%, amber ring and glow) used by the next key and primary buttons.

---

## How to execute this plan

### Branch and rollout

- All work is on `claude/clever-thompson-ohqxvp`, on top of what is already pushed, into the open pull request. Pull with rebase before every push: another session also pushes here.
- Nothing is merged, tagged (`v1-legacy`) or deployed. That happens only when the owner says so.
- Commit after every green slice. Messages are imperative and describe behaviour.
- Code rules: no comments in code, never the `any` type.

### Required skills

1. **`tdd`**: vertical slices only (one failing test, then the minimal code, repeat). Never write all tests first. Tests go only at the seams below. Expected values come from independent sources (literals, worked examples, the mockups), never from re-implementing the code. Refactoring belongs to the review step.
2. **`laws-of-simplicity`**: before each task, state what can be removed (REDUCE) and how the task fits the whole (CONTEXT). After each task, give it a `simplicity_delta` from -5 to +5 in the footer of the last commit (`simplicity_delta: +3`). Every task below lists what it deletes; deleting it is part of the task, not a follow-up. Before declaring a bug or a missing behaviour, trace the real call path and state the evidence.

### Seams (the only places tests are written)

These are the seams of the rebuild plan. No new seam is added. Approving this plan confirms them for this work.

| Seam | Used here for | Catches | Misses |
|---|---|---|---|
| S1 Engine API | Progress model (`progress.ts`, `outcome.ts`), settings defaults, token contrast (`src/styles/tokens.test.ts`), `metricsOf` on an unfinished session, credits data | Star and completion rules, defaults, contrast regressions | Anything visual |
| S3 Storage | `sanitizeProfile` and import of saves and backups that lack the new fields | Old data still loads, hostile data rejected | Real browser quota |
| S5 Browser | Tap/Tab to start, surah-complete dialog, bottom tab bar, About sections, Settings About link, reduced motion, axe, ARIA snapshots | Real input, layout, mobile viewport, end-to-end flows | Real phone keyboards (manual checklist in `docs/QA-DEVICES.md`) |

(S2 data builds are untouched. S4 component tests do not exist in this repo; widgets are tested at S5.)

### Verification (owner's choice D12)

- Every step: `pnpm check`, `pnpm typecheck`, `pnpm test` (unit). These drive the red-green loop at S1 and S3.
- A task that changes browser behaviour writes its Playwright test first and runs only the spec it changes (`pnpm build && pnpm exec playwright test <spec>`). Never skip or loosen a test.
- ARIA baselines are regenerated only in Task F14, after the markup has settled.
- The full gate, `pnpm verify`, runs once in Task F15. It must be green before anything is called done.

### Task loop (run for every task, in order)

1. Invoke `tdd` and `laws-of-simplicity`. Read the task, the mockups it touches, and its Acceptance.
2. Implement slice by slice: red, green, commit.
3. Delete what the task lists under **Removes**.
4. Run the step checks from *Verification*.
5. At a **checkpoint** (C1 to C4), stop: take real-app screenshots with Playwright at the same sizes as the mockups (1440×900 desktop, 390×844 phone, device scale 2, seeded profile as in the mockups) and show them to the owner. Apply their feedback before continuing. Checkpoints are where the look is decided; later tasks must not silently change it.
6. **Review sub-agent per checkpoint** (not per task). Spawn a fresh `general-purpose` sub-agent with the brief below. **Every sub-agent created for this plan must use model Sonnet 5.5 (`sonnet`) at effort level Medium (`effort: "medium"`).** If sub-agents are unavailable, run the same brief yourself as an adversarial reviewer over the whole diff.
7. The reviewer reports findings only, in the format `[severity] file:line - finding - how to reproduce - suggested fix`. **The main agent fixes every finding**, test-first when it is a behaviour, and commits `Address review of checkpoint N` with the `simplicity_delta` footer.

**Review brief (paste into the sub-agent prompt, with the checkpoint and `git diff <previous-checkpoint>..HEAD`):**

> You are an adversarial reviewer. Review only the changes since the previous checkpoint against this plan's Decisions, the mockups in `docs/design/focus/`, and the contracts below. Assume the code is wrong until you have tried to break it. Run it where you can (`pnpm dev`, Playwright). Prioritise **fidelity to the mockups and UI/UX coherence**, then ARIA correctness, correctness, test quality (implementation-coupled or tautological tests are findings), simplicity (dead code, speculative options, anything removable, anything the plan says must be deleted that is still there), i18n parity (en/ar) and the respect rules. Report findings only. Do not edit files.
>
> **Accessibility contract (cite as A#):** A1 landmarks and one `h1` per page, heading order never skips; A2 skip link, `aria-current="page"` on the active nav item; A3 everything operable by keyboard in a logical order that matches the visual order in LTR and RTL, no keyboard trap (Tab always leaves the typing input); A4 visible focus indicator of at least 3:1, shown for keyboard focus (the typing text is exempt by the owner's waiver, D13: its caret is the cue); A5 text contrast of at least 4.5:1 and UI contrast of at least 3:1 in the single dark theme, except the waived untyped lesson text; A6 information never conveyed by colour alone (the next key is also bold and named in the caption; the star has text); A7 native elements before ARIA, every control has an accessible name; A8 dialogs are native `<dialog>` with `aria-labelledby`, Escape closes, focus returns to the opener; A9 live regions are polite and sparse, never per keystroke; A10 correct `lang` and `dir` on mixed-language fragments, logical CSS properties only (`ms-`, `me-`, `ps-`, `pe-`, `start`, `end`), except safe-area padding; A11 `prefers-reduced-motion` honoured (static card, no rays, solid caret); A12 nothing lost at 200% text or 320 px width; forced-colors mode still usable.
>
> **Mobile contract (cite as M#):** M1 designed at 320×568 first, `min-width` breakpoints only (`sm` 480, `md` 768, `lg` 1024); M2 viewport meta unchanged (never disables zoom); M3 `dvh`/`svh`, one flexible scroll region, no `visualViewport` JavaScript; M4 touch targets of at least 44×44 px, `touch-action: manipulation`; M5 `env(safe-area-inset-*)` respected, including the bottom tab bar; M6 the typing input stays inside the surface at 16 px or larger; M7 dialogs are bottom sheets below `md`; M8 landscape phone with the keyboard open still shows the current line.
>
> **Respect contract (cite as Q#):** Q1 Qur'an text is whole, in order, verbatim; Q2 Practice never shows Qur'an text; Q3 the celebration happens only when a surah is completed, never while typing, no sound, no emoji, no confetti (amended by D9); Q4 Qur'an text is never used as decoration or UI labels (the surah name on the card is the title of what was completed, as in the old app); Q5 audio never moves the cursor and typing never starts audio; Q6 audio is always optional.

---

## Tasks

### Phase A: Foundation

#### Task F1: Record the decisions and the reference

**Goal:** The decisions, waivers and mockups live in the repo before any code changes.

**Files:** `docs/TECHNICAL.md`, `README.md`, this plan, `docs/design/focus/*` (already committed with this plan).

- [ ] Add a "Design decisions 2026-11-12" section to `docs/TECHNICAL.md`: D1 to D12, the contrast waiver, the reversal of Q3, dark only, and that Arabic copy for new strings is not human verified.
- [ ] Update the README sentence about colour and About if it mentions light mode, the footer, or the credits being listed.
- **Removes:** nothing. **Acceptance:** `pnpm check` is green; the section names every decision above.

#### Task F2: Dark-only tokens

**Goal:** One palette, the tokens above, no light theme, no finger tokens.

**Files:** `src/styles/tokens.css`, `src/styles/globals.css`, `src/styles/tokens.test.ts`, `index.html`, `public/site.webmanifest`, every `border-line`, `bg-surface`, `text-muted` use that is wrong under the new tokens.

**Interfaces:** the token table; `@utility halo`; `:root { color-scheme: dark }`; `<meta name="color-scheme" content="dark">`; one `theme-color` (`#08090b`); manifest `background_color` and `theme_color` `#08090b`.

**Tests (S1), first:** rewrite `tokens.test.ts` for one palette. Pairs: ink, muted, accent, danger, each on page and surface at 4.5; `on-accent` on `accent` 4.5; `focus` and `edge` on page and surface at 3; `ink` on `upcoming` at 4.5 (typed text must stand out from untyped); `upcoming` on `page` at 3.0 (the waiver floor). Start red by asserting the new token names exist.

- [ ] Replace the palette and delete the dark media block and the `finger-*` tokens.
- [ ] Controls identified only by their outline (inputs, textarea, radio, switch, slider, number field) move from `border-line` to `border-edge`. Text buttons keep the faint `line`.
- [ ] Remove the light variants from the e2e files that loop over schemes (`shell`, `stats`, `a11y-matrix`, `about`, `audio`, `transfer`): the list becomes `["dark"]`.
- **Removes:** the light palette, the `prefers-color-scheme` block, `finger-*` tokens, the two `theme-color` metas, light e2e variants.
- **Acceptance:** token test green; `pnpm build` succeeds; nothing in `src` references a removed token (`pnpm check:style`).

#### Task F3: Scheherazade New is the default font

**Files:** `src/settings/fonts.ts`, `src/settings/settings.ts`, `src/settings/settings.test.ts`, `src/typing/TypingSurface.tsx` (line height), any e2e that assumes the old default.

**Tests (S1), first:** `defaultSettings([...]).font` is `"scheherazade"`; an unknown stored font id falls back to it; a stored valid font (`"amiri"`) is kept.

- [ ] Set `DEFAULT_FONT` to `"scheherazade"` and list it first in `FONTS` so Settings shows it first.
- [ ] Scheherazade is taller than Naskh: review `leading-loose` and the 60 dvh scroll region in the surface and set a line height that matches the mockups (about 2.0).
- [ ] Default size stays 40 (mockups use up to 42); do not change the size list.
- **Removes:** the assumption in tests and docs that Noto Naskh is the default.
- **Acceptance:** unit tests green; the surface in the mockups is reproduced at default settings.

### Phase B: The typing surface

#### Task F4: No pill, tap or Tab to start

**Goal:** The text is the way in. D7.

**Files:** `src/typing/TypingSurface.tsx`, `src/typing/useTypingInput.ts` (only if needed), `src/styles/globals.css`, `e2e/helpers/typing.ts`, `src/i18n/en.ts`, `src/i18n/ar.ts`.

**Tests (S5), first, in `e2e/typing.spec.ts`:**
1. Clicking the text region focuses the typing input and the next typed key advances the caret.
2. Tab from the heading reaches the typing input (named "Type the text shown"); no ring is drawn (D13); Tab again leaves it (A3).
3. With the input unfocused the caret element exists and has the waiting animation; with `prefers-reduced-motion: reduce` it has none.
4. No element named "Start typing" or "Continue typing" exists on Recitation and Practice (Custom's form button keeps its name).
5. Tapping the text on `chromium-mobile` focuses the input (M6).

- [ ] Delete the pill button. Put the click handler on the surface (`onClick`, so scrolling gestures do not start typing).
- [ ] The hidden input becomes a Tab stop (`tabIndex` 0) with its existing label and description.
- [x] Focus ring only for keyboard-initiated focus. **Superseded by D13 after C1:** the ring, the `data-modality` flag and `src/app/inputModality.ts` were removed.
- [ ] Waiting caret: a slow blink while the surface is unfocused and not complete, solid while focused, solid under reduced motion.
- [ ] Surface visual: no border, no background, no radius; text centred; a bottom fade where the region scrolls. The mistake state keeps its wavy underline and the polite "Mistake." status; the red border goes.
- [ ] Add `startTyping(page)` to `e2e/helpers/typing.ts` (clicks the "Text to type" region). Do not edit the other specs yet (Task F14).
- **Removes:** the pill and its `typing.continue` string (en and ar), the border and error border on the surface, the `focus-within` ring rule if replaced.
- **Acceptance:** the five tests green; `pnpm check`, `pnpm typecheck`, `pnpm test` green.

#### Task F5: Guide keyboard: outlines, halo, no tints

**Files:** `src/keyboard/GuideKeyboard.tsx`, `src/keyboard/fingers.ts`, `e2e/guide.spec.ts`.

**Tests:** S1 `guideFor` is unchanged and its tests stay as they are (they are the safety net). S5 in `guide.spec.ts`: every key has the same fill; the due key has `data-due`, a heavier border and bold legend; the caption names the finger and adds ", with Shift" when needed; with "Show which finger to use" off the caption is gone and nothing else changes.

- [ ] Keys: transparent fill, `border-line`, muted legend (4.5 : 1 against the page), 36 px high, 5 px gap, rounded. Due key: `halo`, amber legend, bold. The Shift key of the other hand is due too, as today.
- [ ] Remove tints from the component. The `fingerGuide` prop and setting now gate only the caption.
- [ ] Delete exports of `fingers.ts` that nothing uses afterwards (the digit table, `Digit`, `fingerOf` if only tints used them). Keep what `guideFor` needs.
- **Removes:** `TINTS`, `FIXED_DIGITS`, the `fingerOf` import, the tint classes, dead exports in `fingers.ts` and their tests.
- **Acceptance:** guide spec green; `check:style` reports no unused exports.

#### Task F6: Text colours and highlights

**Files:** `src/styles/globals.css`, `src/typing/TypingSurface.tsx`.

**Interfaces:** lesson text base colour `upcoming`; `::highlight(mafatih-done)` colour `ink`; `::highlight(mafatih-apparatus)` colour `apparatus`; `::highlight(mafatih-playing)` amber wash with a 2 px underline; forced-colors rules unchanged.

**Tests (S5):** after typing four words the computed colour of the done highlight is `ink`; the untyped text colour is `upcoming` (read from the token, not hard-coded); in forced-colors the highlights fall back as today.

- **Removes:** accent colour on done text.
- **Acceptance:** matches `typing-desktop.png` at the same state.

#### Task F7: Live stats line (desktop)

**Goal:** The quiet "142 cpm · 96% · 3 errors · 0:42" line under the text in Recitation and Custom (not Practice, which has its own strip).

**Files:** new `src/typing/LiveStats.tsx`, `src/typing/session.ts` (only if needed), `RecitationPage.tsx`, `CustomPage.tsx`.

**Tests (S1), first:** `metricsOf` on an unfinished session returns the speed, accuracy and error count so far (literal worked example). Extend minimally only if it does not.

- [ ] Updates on each keystroke, never on a timer, so nothing ticks and nothing is announced (`aria-hidden`, A9). Hidden below `md` (D8).
- **Removes:** nothing. **Acceptance:** line matches the mockup, absent on a 390 px viewport.

> **Checkpoint C1 (done 2026-11-13):** typing screen, desktop and phone, English and Arabic, idle and typing, shown to the owner. Answers (D6, D13): the lesson font setting only changes the lesson text, everything else keeps a fixed interface font; the wordmark is not in the lesson font; no focus ring around the typing text; a calmer waiting caret. Implemented in the commit after C1 (`main.tsx` loads Noto Naskh Arabic 400 and 600 eagerly, `body` font stack starts with it, `caret-wait` is 2.4 s ease-in-out).

### Phase B2: Audio controls (the owner asked for this before the other remaining tasks)

#### Task A1: Audio controls redesign

**Why:** the owner does not like the current audio controls (a bordered card with a button row, a volume slider, a switch and a status line). They also want back the **repeat toggle of the old player**.

**Process:** two showcase rounds happened (2026-11-13) and the owner decided (D20). The build is part of Task F11.

**The decided design (build to the mockups):**

- Row: Repeat, Previous ayah, the **dial**, Next ayah, the speaker. Desktop: in the footer centre; phone: above the tab bar, with a caption row under it. The dial is 76 px on desktop and 84 px on phones; Repeat and the speaker are amber while on or open.
- **Dial:** a ring with one arc per stop, in order, starting at the top and going clockwise: the basmala (when the passage opens a surah that has one) and then each ayah, so at most five arcs. Arc length is proportional to the stop's number of words, with a minimum arc of 15 px so a one-word ayah never disappears (the layout function: sizes proportional to weight, any size under the minimum is fixed at the minimum and the rest is shared again). A single stop is a full circle. Passed arcs are grey, the current arc fills in amber with the clip's playback fraction, the rest are dim. The centre is the play or pause button. **Arcs are not clickable and are hidden from assistive technology**; the buttons carry every action.
- **No caption and no other text around the dial (D21).** The recited ayah, the reciter and the basmala are said only in the polite, visually hidden status line.
- **Audio panel:** the speaker (`aria-expanded`, `aria-controls`) opens a non-modal panel above it with: a Mute toggle (`aria-pressed`, name "Mute"), the Volume slider (name "Volume", value text in percent), the "Play whole passage" switch and the reciter line (`Abdul Basit · Murattal · 64 kbps`). It closes on Escape (focus returns to the speaker), when focus leaves it, and on a pointer press outside it. On phones it is anchored to the right edge.
- **The reciter, style and ayah sentence stays in a polite, visually hidden status** (`Abdul Basit · Murattal 64 kbps · 36:14`) so screen readers hear it, as today.

**Every control and state the build must hold:** play and pause; previous and next ayah; the position in the passage (which ayah is playing); **repeat passage (toggle)**; mute and volume; "play whole passage" (off means stop at the end of each ayah); the reciter and style line (name, style, kbps, ayah), with the basmala as its own stop; the unavailable state; the loading state; and the setting for choosing the reciter stays in Settings. Quiet by default: the passage stays the hero, nothing loud, one amber accent (D1, D5). Phone and desktop both designed; icon buttons need 44 px targets (M4) and an accessible name; the media-session handlers stay.

**Repeat behaviour (from the old app, `git show main:src/hooks/useRecitationPlayer.ts` and `cypress/e2e/recitation.cy.ts`):**

- Off (default): the passage plays to its last ayah and stops there.
- On: when the last ayah ends the passage starts again from its first stop (the basmala when the passage opens the surah) and keeps playing.
- On: Next on the last stop wraps to the first stop and stays paused. Previous keeps its rule (restart the ayah after two seconds, else step back).
- On with "Play whole passage" off: playback still stops at the end of each ayah in the middle of the passage, and still wraps at the true end of the passage.
- A toggle button with `aria-pressed`, named "Repeat passage" (the old app said "Repeat the passage" and "Stop repeating the passage"). The choice is saved in the profile (a new `loop` boolean in settings, default `false`, tolerated when missing in saves and backups, no schema bump).

**Tests, first (S1):** `stopWeights` and the arc layout (for the word counts in `audio-long-short-cases.png`: one stop is a full circle; 15, 129, 32, 28 gives the long ayah the most and no arc under the minimum; 1, 2, 2, 2 gives each at least the minimum; sizes add up to the circumference minus the gaps); `playerReducer` cases for each rule above (a `loop` flag on the state or the `ended` and `next` actions); `defaultSettings` has `loop: false`; `sanitizeSettings` keeps a boolean and drops anything else. **(S3):** a save and a backup without `loop` still load. **(S5, in F11):** `audio.spec` covers repeat on and off with the stubbed audio, and that it survives a reload.

- **Removes:** whatever the chosen design makes redundant (the `fieldset` card, the always-visible slider and switch if the design tucks them away).
- **Acceptance:** the owner has approved a design; the build and its tests are done in F11.

### Phase C: Stars data, shell, primitives, Recitation pages

#### Task F8: Best accuracy per surah (the data behind stars)

**Goal:** Know, per surah, the accuracy of the run in progress and the best completed run.

**Files:** `src/recitation/progress.ts`, `src/recitation/outcome.ts`, `src/recitation/useRecitation.ts`, `src/storage/profile.ts` tests, `src/recitation/progress.test.ts`, `src/recitation/outcome.test.ts`.

**Interfaces (S1):**

```ts
export const STAR_ACCURACY = 0.95;
export interface RunTally { readonly correct: number; readonly total: number; readonly ms: number }
export interface SurahProgress {
  readonly typed: readonly AyahRange[];
  readonly completions: number;
  readonly run: RunTally;
  readonly best: number;
}
export function completedSurahs(progress: RecitationProgress): number;
export function starCount(progress: RecitationProgress): number;
export function starredOf(progress: RecitationProgress, surah: number): boolean;
export interface RecitationOutcome { readonly stats: KeyStats; readonly recitation: RecitationProgress; readonly finished: RunTally | null }
```

`applyRecitationAyah` adds the ayah's samples to `run` (`correct` = samples marked correct, `total` = samples, `ms` = sum of latencies, nulls as 0) only when the ayah is newly recorded, as it already does for stats. On the ayah that completes the surah it returns the finished tally as `finished`, sets `best` to the larger of `best` and that run's accuracy, and resets `run`. Accuracy and speed of a run are derived from the tally (`correct/total`; `total` per minute of `ms`).

**Tests, first (S1):** (a) a surah completed with 19 of 20 samples correct is starred (0.95 is enough); 18 of 20 is not; (b) `best` never goes down after a worse second run; (c) retyping an already typed ayah does not change `run`; (d) `finished` is non-null exactly once, on the completing ayah. **(S3):** `sanitizeProfile` loads a save and a backup that have no `run` or `best` (defaults zero) and clamps nonsense (negative, over 1, strings).

- [ ] No schema bump: the fields are additive with defaults, so existing saves and exports import unchanged.
- [ ] `useRecitation` keeps `finished` in state (not persisted) for the dialog and clears it on close.
- **Removes:** nothing. **Acceptance:** unit tests green; `transfer.test.ts` still passes without edits.

#### Task F9: UI primitives

**Files:** `src/ui/styles.ts`, `Dialog.tsx`, `Switch.tsx`, `RadioGroup.tsx`, `SegmentedControl.tsx`, `LessonSummary.tsx`, `PageHeading.tsx`, `ConfirmChoice.tsx`, `src/styles/globals.css` (`progress`).

**Interfaces:** `BUTTON` (ghost, `line` outline, 44 px, rounded-xl), `PRIMARY_BUTTON` (`halo`), `DANGER_BUTTON`. `Dialog`: centred card from `md` up, bottom sheet with a grab bar below it, sticky header with the title and one "Done" button, `surface` background. `Switch`: amber when on. `RadioGroup`: amber dot, `edge` ring. `LessonSummary`: the quiet summary of `screens-desktop.png` (uppercase mono labels over values, one primary action, one ghost action). `progress`: 2 px amber rail.

**Tests (S5):** dialogs still pass the existing focus-return and Escape tests; radios and switches keep their roles and names.

- **Removes:** the old bordered button, card and fieldset styling, old shadows, and any class that no longer has a user.
- **Acceptance:** `settings.spec` and `transfer.spec` dialog tests green.

#### Task F10: Shell

**Files:** `src/app/Shell.tsx`, `src/settings/SettingsButton.tsx`, `src/app/pages.ts`, `src/styles/globals.css`.

**Interfaces:** desktop header: Arabic wordmark (`lang="ar"`, accessible name from `app.name`), nav as plain text, Settings as the last item (opens the dialog). Below `md`: header with the wordmark and a settings icon button (44 px); a fixed bottom tab bar with Recitation, Practice, Custom, Stats, `aria-current="page"`, safe-area padding; `main` gets bottom padding so nothing hides behind it. The tab bar is hidden with CSS only while the typing input is focused: `body:has([data-typing-input]:focus)`. The footer and its About link are removed (D11). Skip link and focus-the-heading-on-navigation stay.

**Tests (S5), first:** at 390 px the tab bar exists and the header has no nav; Tab order is skip link, wordmark area, settings, main; the tab bar is not visible while the input is focused; at 1440 px there is no tab bar and no footer landmark; Arabic UI mirrors the order.

- **Removes:** the footer and its landmark, the Stats icon variant, the old header border and bold Latin wordmark, the `sm:` nav spacing hacks.
- **Acceptance:** `shell.spec` and `keyboard-walk.spec` updated for the new order and green.

#### Task F11: Recitation pages

**Files:** `src/recitation/SurahMap.tsx`, `PassageBar.tsx`, `RecitationPage.tsx`, `audio/Player.tsx`, `src/i18n/*`.

**Surah list (`SurahMap`):** a single column, `max-w-2xl`: a title, a tally line ("2 of 114 surahs complete", star, "1 star"), the Continue card with the primary button, then one row per surah: number, name with its meta line, Arabic name, a thin amber progress line, and one mark: ★ if starred, ✓ if completed. On phones a row has no empty progress bar and shows a single mark (see `mobile-typing-home.png`). A line explains the rule: "Finish a surah to complete it. Hold 95% accuracy to earn a star." (hidden on phones).

**Passage page:** the page heading `h1` is the small spaced label ("YASEEN · 13–16"); on phones it has no second line (D8). The two hint sentences become screen-reader-only text referenced by the input's description. Footer from `md` up: progress rail, "12 of 83 ayat", the audio controls (A1), Previous and Next passage. On phones: the thin rail, then one row of icon controls (previous passage, audio, next passage), icon only while the phone keyboard is up.

**Audio controls:** built to the design the owner approves in Task A1, including the repeat toggle and the `loop` setting. **"Go to ayah" is not in the mockups and is decided at C2:** proposal, it lives behind the progress text as a disclosure containing the existing number field and Go button. Both keep every current accessible name so the existing audio and map specs still apply.

**Tests (S5), first:** the list shows ★ on a starred surah and ✓ without ★ on a completed one (seeded profile); no empty bars for not-started surahs at 390 px; no "of 83 ayat" text visible at 390 px; the audio and go-to-ayah specs pass with the new controls, and repeat works as in A1.

- **Removes:** the `Ring` SVG and card grid, the bordered `PassageBar` fieldset and `Player` card, the visible hint sentences, the `typed` text on phones.
- **Acceptance:** `recitation-map.spec`, `recitation.spec` and `audio.spec` green.

> **Checkpoint C2:** shell, list, passage page footer, the built audio controls and the go-to-ayah panel, desktop and phone, English and Arabic. Owner decides the go-to-ayah panel.

### Phase D: Celebration

#### Task F12: Surah-complete dialog

**Goal:** When the last ayah of a surah is typed, a card appears with the surah name, rays, figures and a star if earned. D9.

**Files:** new `src/recitation/SurahComplete.tsx`, `RecitationPage.tsx`, `src/styles/globals.css`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/ui/LessonSummary.tsx`.

**Interfaces:** `<SurahComplete open surah tally starred completions onContinue onAgain>` built on the native `<dialog>` pattern of `Dialog` (labelled by its heading; focus moves to the primary button; Escape and the backdrop act as "continue"; focus is restored to the surface afterwards). Content: the Arabic name (large, glowing), "{surah} complete", the first-time line ("Every ayah typed, well done.") or the repeat line ("Typed through for the 3rd time."), four figures (ayat, accuracy, speed, time from `finished`), the star line ("95% accuracy or better", only when this run reached it), "{n} of 114 surahs complete", the primary "Continue to {next surah}" and the quiet text button "Type it again". Below `md` it is a bottom sheet with the primary button full width. A polite status announces the completion once.

Animation (all in `globals.css`, only inside `@media (prefers-reduced-motion: no-preference)`; otherwise the card is static and the rays are `display: none`): 18 rays, amber with every third one lighter, `burst` 1.2 s per cycle, staggered 0 / 60 / 120 ms, **iteration count infinite**; the card `rise` 0.45 s once; the name `glow` 2.4 s and the `halo` `pulse` 2.4 s, **infinite**; the star `starpop` 0.55 s once, delayed 0.5 s. Only `transform`, `opacity` and the name's `text-shadow` animate. Rays take their angle and delay from `style` custom properties set through React (allowed by the CSP, which blocks inline `style` attributes in markup but not CSSOM writes); type them with `CSSProperties`, never `any`.

**Tests (S5), first:** typing through the last ayah of a short surah fixture opens the dialog (named "…complete") with the right figures; a run at 95% or better shows the star line and a worse run does not; the first completion shows the first-time line and a second shows the repeat line; `.ray` elements have `animation-iteration-count: infinite` with motion allowed and are not displayed with `prefers-reduced-motion: reduce`; "Continue to …" goes to the next surah; "Type it again" restarts the surah; the dialog is a bottom sheet at 390 px; no dialog appears when a passage inside a surah is finished (the quiet summary shows instead).

- [ ] Arabic strings for every new key, reviewed for parity by the i18n parity test.
- **Removes:** the completion branch of `LessonSummary` in `RecitationPage` (the title and details props it needed), `completion.times`/`completion.time` strings if now unused.
- **Acceptance:** specs above green; `celebration-frames.png` reproduced by freezing animations at the same times.

> **Checkpoint C3:** the real card (stills at the mockup times plus a screen recording or GIF of the loop), desktop and phone, English and Arabic, starred and not starred, reduced motion.

### Phase E: Remaining pages

#### Task F13: Practice, Stats, Custom, About, Settings

**Files:** `src/practice/Hud.tsx`, `PracticePage.tsx`, `src/stats/StatsPage.tsx`, `src/custom/CustomPage.tsx`, `src/app/AboutPage.tsx`, `src/app/credits.ts`, `src/app/credits.test.ts`, `src/settings/SettingsDialog.tsx`, `src/i18n/*`, `e2e/about.spec.ts`.

- [ ] **Practice:** the HUD becomes the quiet strip (uppercase mono labels over values: keys unlocked, newest key, accuracy, time per key, last lesson), no box. The unlock announcement keeps its polite status.
- [ ] **Stats:** the mode choice as the segmented control; keys table and last-ten-lessons table side by side from `lg`, stacked below, hairline rows, amber meters.
- [ ] **Custom:** textarea with an `edge` outline on `surface`; "Start typing" form button is `PRIMARY_BUTTON`.
- [ ] **About (D10):** delete the "How this site was made" `Section` and the `ASSISTANT` constant; delete the `about.madeHeading` and `about.made` strings; delete the "Source code" entry from `CREDITS` and the `about.codeLabel` and `about.codeNote` strings (en and ar). The remaining sections (What you type, Privacy, Credits) stay.
- [ ] **Settings (D6, D11):** fonts list shows Scheherazade New first with its preview; the dialog ends with an "About" link to the existing page (closes the dialog on use); the keyboard-guide group stays hidden on touch screens, as today.

**Tests, first:** S1 `credits.test.ts` no longer expects a code entry and still requires every remaining source to have a name and link. S5 `about.spec.ts`: the headings are exactly "What you type", "Privacy", "Credits"; there is no "How this site was made" region and no "Source code" or GitHub link; the Settings dialog has an About link that navigates to the page and returns focus sensibly (A8). S5 `settings.spec.ts`: the font radios list all three with Scheherazade New selected on a fresh profile.

- **Removes:** the two About sections and their strings, the `ASSISTANT` constant, the HUD box, the stats table borders, the footer About link (done in F10).
- **Acceptance:** specs above green; i18n parity test green.

> **Checkpoint C4:** every page at 1440 and 390, English and Arabic, with the Settings dialog and the About page.

#### Task F13b: Search and social images and favicons (D16)

**Goal:** a light touch, not a redesign. The owner liked the current images. Keep the composition and make them coherent with Focus.

**What exists:** `public/og-image.png` (1200×630: warm near-black `#1c1917`, the Arabic wordmark in white with a sky-blue caret bar, "Mafatih" and the tagline in white and grey, four keycaps with one lit in sky blue), `public/favicon.svg` and `favicon.ico` (a rounded `#1c1917` tile with a white letter and a sky-blue underline bar), `apple-touch-icon.png` (180), `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`. `index.html` holds the `<title>`, description, `og:*` and `twitter:*` tags and the JSON-LD block; `site.webmanifest` already uses `#08090b` (F2).

**The touches:**

- Background `#08090b` (the page colour) and keycap faces `#101114` with the `line` outline, so they read as the app's outlined keyboard.
- Replace the sky-blue accent (the caret bar, the lit key, the favicon underline) with the amber `#e2b062`; the lit key gets the halo (amber wash, amber border, soft glow).
- Wordmark in Noto Naskh Arabic at the same size and place, ink `#ebe8e2`; the Latin name and tagline keep their place, tagline in the muted grey `#8f9299`.
- Same four keycaps and the same layout, so it still looks like the same site.
- Favicon: same tile and letter with the new background and an amber bar; check it at 16 and 32 px. Apple touch icon and the three manifest icons follow; the maskable icon keeps its safe zone.
- Text in `index.html`, the JSON-LD and the manifest is unchanged unless it contradicts the new copy. `og:image:alt` is updated if the picture's content changes.

**Process:** render the new images from a throwaway script (HTML to PNG with Playwright, SVG for the favicon, `sharp` or Playwright for the PNG sizes; nothing added to the dependencies). Show before and after for the OG image and the favicon at 16, 32 and 180 px to the owner together with C4.

**Tests (S1):** the existing `scripts/site.test.ts` stays green (every file referenced exists; sizes are right); add one assertion that the theme colour and manifest background match the page token. The images are checked by eye.

- **Removes:** the old images (overwritten), nothing else.
- **Acceptance:** the owner approves the new images; `pnpm check`, `pnpm test` green.

### Phase F: Tests, baselines, docs

#### Task F14: End-to-end sweep and baselines

**Files:** all `e2e/*.spec.ts`, `e2e/helpers/*`, `e2e/aria-snapshots.spec.ts-snapshots/*`.

- [ ] Replace every `getByRole("button", { name: "Start typing" }).click()` on Recitation, Practice and the Custom lesson with `startTyping(page)` (about 50 call sites in 12 specs). Custom's form button keeps its name.
- [ ] `a11y-matrix`: dark only; the lesson text is excluded from the `color-contrast` rule only; 320 px and 200% text sweeps stay (with the wide font); axe in English and Arabic.
- [ ] `keyboard-walk`: new tab order, bottom tab bar, no footer; every control but the typing text shows its focus ring.
- [ ] `perf.spec`: re-measure with Scheherazade as default; change a threshold only with a measurement written in the commit message.
- [ ] Regenerate the ARIA baselines (`pnpm exec playwright test aria-snapshots --update-snapshots`), then read every changed baseline for unintended changes before committing them.
- **Removes:** all pill clicks, all light-scheme loops, stale baselines.
- **Acceptance:** `pnpm e2e` green on `chromium-desktop` and `chromium-mobile`.

#### Task F15: Docs and the final gate

- [ ] Update `README.md`, `docs/TECHNICAL.md` (tokens, dark only, stars and the `run`/`best` fields, celebration and reduced motion, tap-to-start) and `docs/QA-DEVICES.md` (phone cases: tap to start, keyboard up layout, bottom tab bar hides, celebration on a phone).
- [ ] Update the pull request description with what changed and the waivers.
- [ ] Run `pnpm verify`. It must be green. Run the final review sub-agent over the whole redesign diff and fix every finding.
- [ ] Pull with rebase, push.
- [ ] **Do not merge, tag or deploy.** Tell the owner it is ready and what the waivers are.

---

## Out of scope

- A light theme or a theme setting.
- New app icons, the social share image, and the manifest icons (they stay as they are; the owner can ask for dark variants later).
- Any new feature other than: the live stats line, stars, the celebration, the Settings About link.
- Changing the Arabic copy beyond adding the new strings.
- Merging, tagging `v1-legacy`, or deploying.

## Risks and how the plan handles them

| Risk | Handling |
|---|---|
| About 50 e2e call sites depend on the pill | One helper (F4), mechanical replacement in F14, never mixed with behaviour changes |
| 64 ARIA baselines change | Regenerated once, after markup settles (F14), each reviewed |
| Waived contrast trips axe | Lesson text excluded from `color-contrast` only; token test pins the floor |
| Always-on animation costs battery or jank | Only `transform`, `opacity` and one small `text-shadow`; none under reduced motion; browsers pause them in hidden tabs |
| Scheherazade is a larger font than Naskh | Loaded lazily as today; `perf.spec` re-measured (F14); `check:size` run in F15 |
| Mockups do not cover the audio panel, go-to-ayah, Practice and Stats on phones, error pages | Proposals in F11 and F13; the owner decides at C2 and C4 from real screenshots |
| Another session pushes to the same branch | `git pull --rebase` before every push |
