# Settings Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Use the `tdd` and `laws-of-simplicity` skills for every task** (see "Required skills"). **Phase 0 (design mock-ups, in rounds, with the user) comes first and no production code changes until the user has approved a design in writing.**

**Goal:** Replace the one very long Settings column with a structure a learner can understand at a glance: settings grouped by what the learner is trying to do, any setting reachable in a couple of taps with little or no scrolling, on phones, desktops, in English and in Arabic. Great UX is the first criterion; every other consideration (code size, effort) comes after it.

**Architecture:** Design first, code second. Phase 0 produces mock-ups in two or three rounds (round 1 wide and different, round 2 concrete) and ends with a "Settled design" section written into this file. Phase 1 builds that design in thin vertical slices behind one small test adapter, so the existing behaviour tests keep guarding every control while the structure around them changes. Behaviour of every setting (what it stores, when it applies, its accessible name) does not change; only where and how it is presented does.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind 4, Vitest (units), Playwright (browser). No new dependencies.

**Spec:** "What is wrong today", "UX targets" and "Settled design" in this file. "Settled design" is empty until Task 0.4; it is filled in from the mock-ups the user approves, exactly as `2026-11-16-one-screen-layout.md` was.

## Decisions so far (owner, rounds 1 to 3; the verbatim record is `docs/design/settings/feedback.md`)

1. **Structure:** master and detail. Settings stays a dialog over the lesson; no separate page.
2. **Design 2** for phone and desktop. Phone: a push list of groups with their current values; the active section's title is **centred in the middle of the dialog** (back on the start side, Done on the end side). Desktop: three columns (rail, controls, preview column).
3. **Groups, in this order:** General, Lesson, Recitation, Your data. General first. Audio is part of Recitation.
4. **The Lesson group holds the live preview and every setting that changes the lesson's appearance or typing UI:** lesson font, text size, vocalization, correcting mistakes with Backspace, and the keyboard guide switches (desktop only, as today).
5. **"Unlock all letters" leaves Settings.** It moves to the Stats page, in its Practice view, above the key table (alternative shown: the progress row of the Practice page; the owner chooses). There is no Practice group in Settings.
6. **The preview must be truthful (binding, utmost importance).** See UX target 10 and the Global Constraints. Drift between the preview and the real lesson must be impossible by construction, and tests must prove it.
7. **One vocabulary** across the interface in English and Arabic (UX target 11, Task 7). First case: the app counts and names **keys** everywhere, so the button is "Unlock all letter keys" (the 8 mark keys deliberately stay locked), never "letters" next to a count of "keys".

## What is wrong today

"Settings" is not a tab. It is a modal dialog (a bottom sheet on phones, a 32 rem box on wide screens) opened by the header button (`src/settings/SettingsButton.tsx` -> `SettingsDialog.tsx`, built on `src/ui/Dialog.tsx`). It is one flex column with `gap-5` holding 12 blocks in the order the features were added, not the order a learner thinks in:

| # | Today's block (top to bottom) | Controls | Where the code lives | Space it takes |
|---|---|---|---|---|
| 1 | Language | 2 radios | inline in `SettingsDialog.tsx` | short |
| 2 | Vocalization | 4 radios, each with a 1-line hint | inline | tall (hints) |
| 3 | Correct mistakes with Backspace | 1 switch + hint | inline | medium |
| 4 | Lesson font | 3 radios, each with a large Arabic preview | inline | very tall (previews) |
| 5 | Lesson text size | 1 slider | inline | short |
| 6 | Keyboard guide (hidden on touch and narrow screens) | 4 switches, 2 hints, layout note | inline | tall |
| 7 | Recitation | 1 select, 2 radios with hints | `src/recitation/RecitationSettings.tsx` | tall |
| 8 | Recitation audio | 2 radios with hints, usage line, delete button, status line | `src/recitation/audio/AudioSettings.tsx` | tall |
| 9 | Backup and restore | 2 buttons, hint, 2 status lines, confirm flow | `src/storage/BackupRestore.tsx` | tall |
| 10 | Unlock all letters | 1 button, confirm flow, status | `src/settings/UnlockLetters.tsx` | medium |
| 11 | Reset progress | 1 button, confirm flow, status | `src/settings/ResetProgress.tsx` | medium |
| 12 | About link | 1 link | inline | short |

Why it feels random, in the learner's words: "Language" (about the app) sits next to "Vocalization" (about typing), then "Lesson font" (about reading), then back to typing ("Backspace"), then reading again (font size). "Unlock all letters" (a Practice shortcut) sits between "Backup" (data) and "Reset" (data). Audio is separated from Recitation by nothing that says they belong together. Radio groups with hints and the font previews make every block 2 to 4 times taller than it needs to be, so the dialog is several screens tall, and nothing tells the learner how far down the rest is.

The settings stored in `Settings` (`src/settings/settings.ts`) that have a control in the dialog: `language`, `vocalization`, `requireBackspace`, `font`, `fontSize`, `showKeyboard`, `fingerGuide`, `keyLabels`, `delayedHint`, `ayatPerLesson`, `surahOrder`, `reciter`. Stored but not in the dialog (they live on the pages): `customText`, `volume`, `muted`, `playWhole`, `loop`. Actions in the dialog: delete saved recitations, download backup, restore backup, unlock all letters, reset progress, open About.

## UX targets (the measurable bar every candidate design is judged against)

These are proposals. The user confirms or changes them with the round 1 feedback; the confirmed numbers go into "Settled design" and become tests in Task 2.

1. **Reach.** Any setting is reachable from "Settings opened" in at most 2 deliberate actions (tap, click or key press) and is visible without scrolling more than half a screen.
2. **Scroll budget.** The tallest screen/pane/page of Settings is at most 1.5 screens tall at 390x844 and fits without scrolling at 1440x900. (Task 0.1 measures today's number and shows it in round 1, so the improvement is visible.)
3. **Grouping.** Every control belongs to exactly one group. At most 7 groups. Group names are task words a learner uses ("Reading", "Typing", "Keyboard guide", "Recitation", "Your data"), not implementation words. A group has at most about 5 controls.
4. **Order.** Most-used first (language, text size, the typing rules), rare and risky last. Destructive actions (reset, restore) are visually separate, last, and keep today's two-step confirmation.
5. **Understandable without reading.** A control's current value is visible without opening it. Hints appear only for the option that is chosen or being considered, not for all options at once.
6. **Feedback.** A change applies at once (as today, no Save button) and the learner can see its effect: the font and size controls show a live sample at the real size; vocalization shows what the learner will be asked to type.
7. **Orientation.** The learner always knows where they are and how to go back or close. Closing returns focus to the Settings button (as today).
8. **Inclusive by default.** Everything works by keyboard and screen reader, in right-to-left Arabic, at 320 px wide with text at 200%, with forced colours, and with reduced motion. Touch targets stay at least 44 px.
9. **No new persisted state.** The restructure adds no field to the profile (`mafatih:profile:2`), backup file or sanitizers. UI state such as "which group is open" lives in memory. Settings still opens at its top.
10. **The preview is truthful by construction.** There is exactly one implementation of the lesson text and one of the keyboard guide (today `TypingSurface` and `GuideKeyboard`). The preview mounts those same components with the learner's real `settings` and a fixed sample whose state comes from the real functions (`buildPrompt`, `requiredMarks` with the learner's real unlocked marks, `createSession`, `applyKey`). It owns no CSS, no rule and no layout for lesson text or keys. If a component cannot be mounted as is (for example `TypingSurface` also runs page-level fitting and reports to the fit-screen context), the task is to extract the shared display part under green tests and have both the lesson pages and the preview use it, never to copy it. The only preview-specific styling allowed is one uniform scale applied to the whole preview subtree (text and keyboard together), and where it is not 100% it is labelled ("Shown at 60%"). Mechanisms the plan requires (details in Task 0.4 and Tasks 3 and 5):
    - **One type:** `LessonDisplaySettings = Pick<Settings, ...>` is the only settings type the lesson display components accept; the preview passes the same.
    - **Exhaustive classification:** a `Record<keyof Settings, "lesson-display" | "other">` in `settings.ts`. Adding a setting without classifying it fails `pnpm typecheck`. Every `lesson-display` key has its control in the Lesson group and nothing else is in it (test).
    - **Parity tests in a real browser** (Playwright): for every `lesson-display` setting and each of its values (all fonts, all sizes, all four vocalizations with different unlocked marks, Backspace on and off, keyboard, finger guide, key labels and delayed hint on and off), render the real lesson and the preview from the same settings and assert identical text, identical computed font family and size (after dividing out the uniform scale), identical highlight ranges and colours, identical keyboard keys, legends and lit key. A parity test that only compares the preview with itself is a defect.
    - **Boundary test** (a source-reading Vitest, like `src/practice/boundary.test.ts`): fails if a preview file defines lesson-text or key styles, draws text itself, or imports anything but the shared components and the session functions.
    - **Behaviour that must show truthfully:** a wrong key is drawn as the real surface draws a pending mistake when Backspace correction is on and not drawn (blocked) when it is off; marks the learner must type dim like letters and marks that are not typed keep the apparatus colour, according to the real vocalization rules; the keyboard guide hides or shows exactly as the real one does.
11. **One coherent vocabulary** in every user-facing string, English and Arabic (see Task 7).

## Global Constraints

- No comments anywhere in code (`pnpm check:style` fails on any). **Never use the TypeScript `any` type**; use `unknown` and type guards.
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `~/` is `src/`.
- New or reworded messages: add the key to `src/i18n/en.ts` first, then `src/i18n/ar.ts`, same placeholders (`i18n.test.ts` checks parity, placeholders and no Latin letters in Arabic). Arabic wording is written for a native reader, not translated word by word; mark any new Arabic wording "not human verified" in the PR text like the rest of the interface.
- Dark only, one amber accent, tokens from `src/styles/tokens.css`. Reuse `src/ui/*` primitives (`Dialog`, `RadioGroup`, `Segmented`, `Switch`, `ConfirmChoice`, `styles.ts`) before writing a new one.
- Every existing accessible name and description in the Settings dialog stays (the specs `e2e/settings.spec.ts`, `transfer.spec.ts`, `guide.spec.ts`, `reduced-motion.spec.ts`, `a11y-matrix.spec.ts`, `aria-snapshots.spec.ts` rely on them). If the settled design changes a name, change the spec in the same task and say why.
- Motion is only inside `@media (prefers-reduced-motion: no-preference)` or with a `motion-reduce:` class (`src/styles/motion.test.ts` and `e2e/reduced-motion.spec.ts` fail otherwise).
- The dialog keeps: `showModal`, closing with Escape, Done and a click outside, focus returned to the Settings button, opening at its top, no scroll of the page behind it, safe-area insets, the phone sheet and the wide-screen centred box (or whatever the settled design replaces them with, pinned by tests of the same strength).
- ARIA snapshots (`e2e/aria-snapshots.spec.ts-snapshots`) are machine-written: after the intended change run `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/aria-snapshots.spec.ts --update-snapshots` and read the diff before committing.
- **Truthful preview (binding):** see UX target 10. No file added for the preview may contain lesson-text or keyboard styling or rules of its own.
- **One vocabulary:** new or changed strings use the terms in `docs/design/settings/glossary.md` (written in Task 7 and read before any string is added). "Keys" is the unit the app counts; never use "letters" for the thing counted as "keys".
- Entry chunk limit 130 KB gzip (`pnpm check:size`).
- Browser tests: `pnpm build` first (Playwright serves `dist`), then `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test <spec> --project=<project> --workers=4`. Never run two Playwright runs at once (port 4173). Headless Chromium hides scrollbars; scroll-extent measurements use `scrollHeight` and `clientHeight`, which are not affected.
- Branch `claude/inspiring-franklin-csy594`. One commit per green slice. Every commit message ends with the two trailer lines `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Co5QwpifPvgjBZJ5SQ2yxA`. Do not open a pull request unless the user asks.

## Review Focus

The input classes this restructure is most likely to break without any test noticing, most likely first. Each is pinned by the task named.

- **The preview drifting from the real lesson** in any setting combination (a font or size that scales differently, a vocalization that dims the wrong marks, a keyboard that shows when the lesson hides it). Pinned by the parity tests of UX target 10.
- A setting that exists but is no longer reachable (forgotten when controls are moved between groups, or hidden on a screen size by a group that is collapsed or off-screen). Pinned in Task 2 (every control found in exactly one named group, by name, on phone and desktop).
- The keyboard guide group, which today is hidden on touch and narrow screens (`hidden md:pointer-fine:flex`). The new structure must not show an empty group on a phone, nor a group tab/row that leads to nothing. Pinned in Task 4.
- Arabic and right-to-left: long Arabic group names wrapping, chevrons and back arrows pointing the wrong way, tab order and arrow-key direction in a tab list or rail. Pinned in Task 6.
- Focus: after drilling into a group, switching tabs, restoring a backup or answering a confirmation, focus must land somewhere sensible (never on `body`, never on a removed element). `BackupRestore` already restores focus to its file input; keep that. Pinned in Task 5.
- Small and large text: 320 px wide with text at 200%, and the largest lesson text size, must not clip a control or put Done out of reach. Pinned in Task 6.

## Required skills

1. **`tdd`**: vertical slices only (one failing test, then the minimal code to pass it, repeat). Never write all the tests first. Tests go only at the seams below. Expected values come from independent sources (literals, the approved mock-ups, the UX targets), never from re-implementing the code. Refactor only on green.
2. **`laws-of-simplicity`**: before each task state what can be removed (REDUCE) and how the task fits the whole (CONTEXT); apply ORGANIZE (grouping is the point of this work), TIME (settings that apply instantly need no Save step), LEARN (hints appear when needed) and TRUST/THE ONE (a single obvious way to do each thing). After each task give it a `simplicity_delta` from -5 to +5 in the footer of its last commit (`simplicity_delta: +3`). Each task lists what it deletes; deleting it is part of the task, not a follow-up. The mock-up rounds must also apply it: fewer groups, fewer visible words and fewer controls on screen beat more features. A design that needs a new abstraction, a new persisted field or a new dependency has to say why a simpler one fails.

## Seams (the only places tests are written)

| Seam | Used here for | Catches | Misses |
|---|---|---|---|
| S1 Engine/unit (Vitest) | Any pure rule the settled design introduces (for example which groups exist for a given screen kind) | Wrong rules, regressions of defaults | Anything visual |
| S5 Browser (Playwright) | Reach, grouping, scroll budget, focus, RTL, 320 px at 200%, reduced motion, axe, ARIA snapshots | Real layout, keyboard and touch behaviour | A real phone (`docs/QA-DEVICES.md`) |

There is no jsdom component-test setup in this repo; widgets are tested at S5. No new seam is added.

## Verification

- Every step: `pnpm check`, `pnpm typecheck`, `pnpm test`.
- A task that changes browser behaviour writes its Playwright test first and runs only the spec it changes. Never skip or loosen an existing test; if a test must change because the design changed on purpose, change it in the same commit and say why in the message.
- The full gate `pnpm verify` runs once, in Task 8. It must be green before anything is called done.

## Review checkpoints

At the end of Task 3 and Task 6, stop, take real-app screenshots with Playwright at 1440x900 (desktop), 390x844 (phone) and 320x568 with text at 200%, device scale 2, English and Arabic, with the approved mock-up beside each, and show them to the user. Apply their feedback before continuing. Then spawn a fresh review sub-agent (model `sonnet`, effort `medium`; if unavailable, run the same brief yourself as an adversarial reviewer over the diff since the previous checkpoint). Brief: "Review only the changes since the previous checkpoint against the approved mock-ups, the UX targets and the Review Focus list in docs/superpowers/plans/2026-11-23-settings-restructure.md. Assume the code is wrong until you have tried to break it; run it with `pnpm dev` and Playwright. Prioritise UX and fidelity to the mock-ups, then accessibility, correctness, test quality (implementation-coupled or tautological tests are findings), simplicity (dead code, speculative options, anything removable), and en/ar parity. Report findings only, as `[severity] file:line - finding - how to reproduce - suggested fix`. Do not edit files." The main agent fixes every finding, test-first when it is a behaviour, in a commit `Address review of checkpoint N`.

---

# Phase 0: Design with the user (mock-ups, in rounds)

**This is the very first step. Write no production code, change no spec and install nothing in the app until Task 0.4 is complete.** The point of the phase is to let the user see and compare real options before anything is built, and to let their feedback, not the agent's taste, decide the design.

## Task 0.1: Baseline and mock-up workbench

**Files:**
- Create: `docs/design/settings/` (the committed PNGs and the HTML sources of each round go here: `round1/`, `round2/`, and `baseline.md`)
- Create: `docs/design/settings/workbench/` holding the shared data and a render script (not shipped; not imported by the app)

- [ ] **Step 1: Measure today.** `pnpm install`, `pnpm build`, serve `dist` (`pnpm preview`) and, with a small Playwright script in the scratchpad, open Settings at 390x844, 1440x900 and 320x568 with text at 200%. Record in `docs/design/settings/baseline.md`: the dialog's `scrollHeight` divided by `clientHeight` (how many screens tall it is), the number of focusable controls, and for each of the 18 controls and actions the scroll distance from the top before it becomes visible. Also record the number of Tab presses to reach "Reset progress". These are the "today" numbers shown beside every candidate in round 1.
- [ ] **Step 2: Take 2x screenshots of today's dialog** (phone, desktop, Arabic phone, scrolled through in 3 or 4 stitched frames) into `docs/design/settings/today-*.png`. Look at them as a first-time learner would and write down in `baseline.md` what is confusing, in plain words (the "what is wrong" table above is the starting point; correct it where the screenshots disagree).
- [ ] **Step 3: Build the workbench.** One HTML/CSS file per candidate, using the app's own tokens (`src/styles/tokens.css`), fonts (Scheherazade New for Arabic samples) and primitives' look (`src/ui/*`), and the **same real content for every candidate**: all 12 settings and all 6 actions, the real English and Arabic strings from `src/i18n/en.ts` and `ar.ts`, the real hints, and the real current values. Fair comparison depends on identical content. A `render.ts` script (tsx) screenshots each page with Playwright at 390x844 (phone), 1440x900 (desktop) and the Arabic/RTL variant of each, device scale 2, into `docs/design/settings/round1/`.
- [ ] **Step 4: Commit** `docs: baseline measurements and mock-up workbench for the settings restructure`.

**Interfaces:**
- Produces: `docs/design/settings/baseline.md` (numbers), the workbench and render script that rounds 1 and 2 reuse.

## Task 0.2: Round 1, a wide range of different ideas

**Goal of the round:** show the user as many genuinely different structures as is useful so they can say what feels right and wrong. The candidates must differ in **structure and interaction**, not in colour or spacing. Do not converge; do not pick a favourite yet. Do not hide a weak idea; a rough idea shown honestly is useful feedback.

- [ ] **Step 1: Produce at least eight candidates, each on phone and desktop (and one Arabic RTL frame each), starting from these directions.** Add others if they are different enough; drop one only if it cannot work with this content, and say why.
  - **A. One scroll, but navigable.** Today's single column, regrouped logically, with a sticky strip of jump links (or a scroll-spy index) and clear section headings. The conservative baseline.
  - **B. Master-detail.** Desktop: a left rail of groups and the chosen group's controls on the right. Phone: a list of groups with their current values; tapping one slides in that group's screen with a back button (a navigation stack inside the sheet).
  - **C. Tabs.** A tab list or segmented control at the top of the dialog (for example Reading, Typing, Guide, Recitation, Data); one pane at a time, the dialog keeps a steady height.
  - **D. Accordion with summaries.** Collapsible groups; each collapsed header shows the current values ("Lesson text: Scheherazade New, 40"); one open at a time.
  - **E. Search first.** A search box at the top ("font", "backspace", "audio") that filters a grouped list; the grouped list is also shown when the box is empty.
  - **F. Preview first.** A pinned live-preview card on top (a real line of lesson text, in the chosen font, size and marks, with a mistake shown the way the current mistake setting would show it) with the controls grouped beneath it that change what the preview shows.
  - **G. Contextual.** Settings opens on the group that matters for the page you came from (Recitation page: Recitation and audio first; Practice: marks and Unlock letters first), with the other groups listed below or one tap away.
  - **H. A page, not a dialog.** A route (`#/settings`) with a roomy two-column card layout on desktop and a stack on phone, with deep links to groups. (Trade-offs to state: leaves the lesson, loses "change and look back"; gains width and shareable links.)
  - **I. Value rows.** An iOS-style list: one row per setting showing the label and its current value; tapping a row opens a small popover or inline picker; no radio list with hints is ever on screen at once.
  - **J. Essentials and More.** Four or five settings that matter to nearly everyone on the first screen (language, text size, vocalization, keyboard guide on or off), everything else behind "More settings" in grouped sections.
- [ ] **Step 2: Also show the compaction techniques on their own**, because they combine with any structure and often matter more than the structure: radio groups with hints turned into a segmented control with the chosen option's hint under it (`src/ui/Segmented.tsx` exists); the three font previews in one row or as a single picker with a live sample; font and size merged into one "Lesson text" block with one live sample; the four keyboard-guide switches reduced to a master switch plus a short detail list; audio cache usage as a one-line row with a small "Delete" action; backup and restore as one row with two actions.
- [ ] **Step 3: Propose the groups.** Show two or three alternative groupings of the same 18 items (for example "by what it changes": Interface, Lesson text, Typing, Keyboard guide, Recitation, Your data, versus "by where it applies": Everywhere, Recitation, Practice, Data). Mark where the grouping is arguable (Vocalization: typing or Practice? Unlock letters: Practice or Data? Audio: part of Recitation?). Say what each grouping costs.
- [ ] **Step 4: For every candidate write a four-line caption:** what a first-time learner sees, taps to reach "Lesson font" and "Reset progress", the scroll height compared with today's number from `baseline.md`, and the one thing it is worst at. No candidate is called "recommended" in this round. Apply `laws-of-simplicity` openly: a candidate that removes controls from the screen should say which and why that is safe.
- [ ] **Step 5: Present round 1 to the user** (send the PNG sheets with `SendUserFile`; where an idea is about movement, also publish a clickable HTML mock-up as a private Artifact so they can try it on their phone). Ask the user, in this order: which two or three directions feel closest; which feel wrong and why; which groupings make sense; whether the UX targets above are right; and anything they miss. Offer 3 or 4 concrete questions at most, not a questionnaire.
- [ ] **Step 6: Commit** the sheets and sources `docs: settings mock-ups round 1`, then **STOP and wait for the user's feedback. Do not start round 2 on your own judgement.** Record the feedback verbatim in `docs/design/settings/feedback.md`.

## Task 0.3: Round 2, concrete designs

- [ ] **Step 1: Choose from the feedback, not from taste.** Take the one to three directions the user liked, plus any combination they asked for (for example "B's phone navigation with F's preview"), and design each fully. If feedback was split or unclear, ask one question rather than guess.
- [ ] **Step 2: Specify every candidate completely.** For each: phone 390x844, tablet 820x1180, desktop 1440x900, the Arabic RTL version of each, and the states that decide whether a design works: first open; a group open; a value changing (live sample); a long Arabic group name; 320 px wide with text at 200%; the three confirmation flows in progress (restore with a chosen file, unlock all letters, reset progress) and their success and error messages; the audio cache with and without files; the keyboard guide group on a phone (hidden or explained); keyboard focus visible on every kind of control; forced colours. State the exact motion, if any, and its reduced-motion version (none).
- [ ] **Step 3: Make the strongest candidate clickable** (one HTML file, no build step, real tokens) and publish it as a private Artifact so the user can use it, not just look at it. Include the measured numbers against today's baseline and the UX targets (reach, scroll budget, groups, controls per group) as a table.
- [ ] **Step 4: Present and ask for one decision per candidate** (go, change X, or drop), then **STOP.** If the user's feedback changes a candidate materially, run a **round 3** (one design, pixel-level, all states) before settling; repeat until the user says "this one".
- [ ] **Step 5: Commit** `docs: settings mock-ups round 2` (and round 3 if needed), with the feedback recorded.

## Task 0.4: Settle the design into this plan

- [ ] **Step 1: Write the "Settled design" section** at the end of this file's header area (above "Global Constraints"), numbered like the one-screen-layout plan's: the chosen structure and navigation; the groups with their exact names (English and Arabic), their order, and which controls each holds; every compaction technique used; per-screen-size behaviour; where focus goes on every transition; the final confirmed UX targets with their numbers; what is explicitly out of scope; and the file list of the mock-ups that are the visual source of truth.
- [ ] **Step 2: Amend Phase 1** below with the exact component names, file paths, props and the exact English and Arabic strings (keys are added in the task that first uses them). Keep each task to one deliverable that is testable on its own. Remove any task the settled design makes unnecessary and add any it needs (for example a `useSettingsRoute` hook if the settled design is a page).
- [ ] **Step 3: Ask the user to confirm the amended plan** before any production code is written, then commit `docs: settle the settings design and amend the plan`.

---

# Phase 1: Build the settled design

**Where this phase still mentions a Practice group, a Keyboard guide group or tabs, the "Decisions so far" section overrides it: the groups are General, Lesson, Recitation, Your data; the keyboard guide switches sit inside Lesson (desktop only); "Unlock all letter keys" is built on the Stats page; the preview mounts the real lesson components. Task 0.4 rewrites this phase to match before any code is written.**

The tasks below are the order of work. They are complete in shape (files, tests, acceptance) but name the new components generically ("the group screen", "the navigation"); Task 0.4 replaces those generic words with the real names. Everything marked "(from the settled design)" is filled in there and nowhere else.

## File structure (before the settled design adds to it)

- `src/settings/SettingsDialog.tsx` (158 lines, owns 6 inline blocks and orders 6 more): becomes the shell that holds the navigation and shows the current group. It no longer renders individual controls.
- One focused file per group (from the settled design), each owning the controls of its group and nothing else. Controls that already have a file keep it (`RecitationSettings.tsx`, `AudioSettings.tsx`, `BackupRestore.tsx`, `UnlockLetters.tsx`, `ResetProgress.tsx`); the inline blocks (language, vocalization, backspace, font, size, keyboard guide) each move to a group file in `src/settings/`.
- `src/ui/*`: reuse. Add a primitive only if two groups need it.
- `e2e/helpers/pages.ts`: one adapter, `openSettingsGroup(page, name)`, the only place that knows how to reach a group.
- `e2e/settings-layout.spec.ts` (new): the reach, grouping and scroll-budget tests.

## Task 1: One adapter between the specs and the layout (pure refactor)

**Files:**
- Modify: `e2e/helpers/pages.ts`, `e2e/settings.spec.ts`, `e2e/transfer.spec.ts`, `e2e/guide.spec.ts`, `e2e/reduced-motion.spec.ts`, `e2e/practice.spec.ts`, `e2e/shell.spec.ts`, `e2e/site.spec.ts` (every place that opens Settings and then looks for a control)

**Interfaces:**
- Produces: `openSettingsGroup(page: Page, group: string): Promise<Locator>` returning the locator that contains that group's controls. Today it opens Settings if it is not open and returns the dialog; after the settled design it also navigates to the group (click the tab, the row or the rail item).

- [ ] **Step 1: Write the failing test.** In `e2e/settings.spec.ts`, a test named `openSettingsGroup returns a locator that contains the named group's controls` that calls `openSettingsGroup(page, "Lesson font")` and expects `getByRole("radio", { name: "Amiri" })` inside the result to be visible. Fails: the helper does not exist.
- [ ] **Step 2: Run it to verify it fails** (`pnpm build && ... playwright test e2e/settings.spec.ts -g "openSettingsGroup"`; expect a missing-export error).
- [ ] **Step 3: Implement `openSettingsGroup`** in `e2e/helpers/pages.ts` so that today it returns the Settings dialog locator; migrate the specs listed above to call it wherever they look for a control, without changing any assertion.
- [ ] **Step 4: Run the whole of the Settings-related specs** (`settings`, `transfer`, `guide`, `reduced-motion`, `practice`, `shell`, `site`) on `desktop` and `phone` projects. Expected: all pass, unchanged assertions.
- [ ] **Step 5: Commit** `test: reach Settings controls through one helper` (`simplicity_delta` footer).

**Removes:** the repeated "open Settings then find the control" snippets in the specs.

## Task 2: The red tests that define the new structure

**Files:**
- Create: `e2e/settings-layout.spec.ts`

**Interfaces:**
- Consumes: `openSettingsGroup` (Task 1).

- [ ] **Step 1: Write the grouping test, red against today's dialog.** A table-driven test `every setting and action is in exactly one named group` whose expected table is the settled design's group table (from the settled design): for each group name, the accessible names of its controls, for example `["Lesson font", "Lesson text size"]` under the group that holds them. For each row: `openSettingsGroup(page, group)` then each control is visible in the returned locator, and the same control is **not** found in any other group's locator. A final assertion counts all controls found and expects 12 settings plus 6 actions (delete saved recitations, download backup, restore, unlock all letters, reset progress, About), so a forgotten control fails the test.
- [ ] **Step 2: Write the reach test.** `any control is reachable in at most 2 actions from a freshly opened Settings` counting the clicks and key presses `openSettingsGroup` performs (expose the count through the helper's return value, not by instrumenting the app).
- [ ] **Step 3: Write the scroll-budget test**, using the numbers confirmed in "Settled design": at 390x844 the dialog's (or pane's) `scrollHeight / clientHeight` is at most 1.5 for every group, and at 1440x900 it is at most 1.0; at 320x568 with text at 200% every control can be scrolled into view and `Done` stays reachable.
- [ ] **Step 4: Run them and confirm all three fail for the right reason** (today: groups do not exist, reach is unbounded, the dialog is several screens tall). Commit the failing tests on a local commit only if the project's convention allows; otherwise keep them uncommitted until Task 3 makes the first one pass.

## Task 3: The shell and the first group (thin vertical slice)

**Files:**
- Modify: `src/settings/SettingsDialog.tsx`
- Create: the navigation component and the first group file (names from the settled design; the first group is the one that holds Language and Lesson text, because it is the most used and the easiest to judge)
- Modify: `src/i18n/en.ts`, `src/i18n/ar.ts` (group names, navigation labels)
- Test: `e2e/settings-layout.spec.ts`

- [ ] **Step 1:** Take the first row of the grouping test and make it the only enabled row (others `test.fixme` with the group name, removed again in Task 4); run it; it fails.
- [ ] **Step 2: Implement the shell**: `SettingsDialog` renders the navigation (from the settled design) and the selected group; the rest of today's blocks stay temporarily in a "Everything else" group so no control disappears while the slice is in progress.
- [ ] **Step 3: Move the first group's controls** out of `SettingsDialog.tsx` into its group file, unchanged apart from the compaction technique the settled design names for them (for example font and size merged into one block with one live sample at the real size).
- [ ] **Step 4:** Run `e2e/settings.spec.ts`, `e2e/settings-layout.spec.ts` (first row), `e2e/aria-snapshots.spec.ts` (expected to differ; review, do not yet update), on both projects. All behaviour specs pass; the first row passes.
- [ ] **Step 5: Commit** `feat: settings opens on grouped screens, first group moved`.
- [ ] **Checkpoint 1** (see "Review checkpoints"): screenshots against the mock-up, user feedback, review sub-agent. **Stop and wait for the user before Task 4.**

**Removes:** the first group's inline blocks from `SettingsDialog.tsx`.

## Task 4: Move the remaining groups, one slice each

For each group in the settled design's order, repeat the loop: enable its row of the grouping test (red), move its controls into its own file with its compaction technique, run its behaviour specs, commit. One commit per group.

- [ ] **Typing group** (Vocalization, Backspace): vocalization as the settled design shows it (for example a segmented control with the chosen option's hint under it and a one-line example of what will be typed). Keep every radio's accessible name and description (`settings.spec.ts` asserts the four descriptions).
- [ ] **Keyboard guide group:** keeps today's rule of being absent on touch and narrow screens. Test first: on a phone project the navigation shows no Keyboard guide entry and no empty screen (Review Focus 2); on desktop it shows with its four switches and the layout note. Make the rule one pure function if the navigation needs it (`isGuideAvailable`, S1 test, with the media-query result as input) rather than duplicating the CSS in two places.
- [ ] **Recitation group** (ayat per passage, surah order, reciter, saved audio): Recitation and Audio become one group if the settled design says so; the usage line and "Delete saved recitations" become one compact row. Keep `audio.usage`, `audio.deleted` and `audio.notDeleted` messages and the `role="status"` line (`audio.spec.ts`).
- [ ] **Your data group** (backup, restore, unlock all letters, reset progress, About): the destructive actions are visually separate and last. `ConfirmChoice` flows are untouched; focus handling stays as in `BackupRestore` (focus returns to the file input) and `useConfirmation` (focus returns to the opener).
- [ ] After the last group: delete the temporary "Everything else" group and the `fixme` markers; the grouping test is fully green and counts 12 settings and 6 actions.

**Removes:** the remaining inline blocks and the temporary group; any `className` left unused.

## Task 5: Navigation behaviour, focus and keyboard

**Files:**
- Modify: the navigation and group files; `e2e/settings-layout.spec.ts`, `e2e/settings.spec.ts`

- [ ] **Step 1: Write one failing test per behaviour, then make it pass, one at a time (vertical slices):**
  - `opening Settings always starts at its first group and its top` (replaces `the dialog always opens at its top`; same strength).
  - `Escape, Done and a click outside still close it and give focus back to the Settings button` (existing test, must stay green and be extended to run from a group other than the first).
  - `the group navigation works from the keyboard` with the keys the settled design names (for a tab list: Left/Right or Up/Down by orientation and direction, Home, End; Tab leaves the list into the pane).
  - `choosing a group moves focus to the pane heading or its first control` and `going back returns focus to the row that was chosen` (for a drill-in design).
  - `a confirmation flow keeps focus inside the group when it ends` for restore, unlock and reset.
  - `the group, a changed value and a status message are announced` (a `role="status"` per group that changes; no duplicate announcements).
- [ ] **Step 2: Commit after each green slice.**

## Task 6: Responsive, Arabic, large text, motion

**Files:**
- Modify: group, navigation and `Dialog`-related styling; `e2e/settings-layout.spec.ts`, `e2e/a11y-matrix.spec.ts` if it enumerates dialogs

- [ ] **Step 1: One failing test, then the fix, for each:**
  - `in Arabic the navigation, its arrows and the key directions are mirrored` (Review Focus 3).
  - `at 320 pixels with text at 200 percent no control is clipped and Done can be reached` (extend the existing test in `settings.spec.ts` to every group).
  - `at the largest lesson text size the live sample does not overflow its box`.
  - `a landscape phone with a display cutout keeps the navigation out of the cutout` (existing test, extended).
  - `with forced colours the selected group and every control are distinguishable`.
  - `with reduced motion nothing in Settings moves when changing group` (and, with motion allowed, any slide is the only motion and sits inside the `no-preference` query).
  - `axe finds no violations in any group, on phone and desktop, in English and Arabic`.
- [ ] **Step 2: Commit after each green slice.**
- [ ] **Checkpoint 2:** screenshots at the sizes above with the mock-ups beside them, user feedback, review sub-agent. **Stop and wait for the user before Task 7.**

## Task 7: One vocabulary across the interface (English and Arabic)

The owner found "Keys unlocked 14 of 44" next to a button "Unlock all letters". Fix that case and audit for every other like it. Do this before the documentation task, because it changes strings and therefore the ARIA snapshots.

**Files:**
- Create: `docs/design/settings/glossary.md`
- Modify: `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/i18n/i18n.test.ts`, `README.md` and `docs/TECHNICAL.md` where they quote a string, and the specs that assert strings.

- [ ] **Step 1: Inventory.** List every user-facing string in the interface (all of `en.ts`, plus text inside components that bypasses `t()`, such as the Language radio labels, font names and the Done and Settings labels), grouped by concept. Not only Settings: the Practice, Stats, Recitation, Custom and About pages, the audio player, the dialogs, error and status messages, `aria-label`s and `title`s.
- [ ] **Step 2: Write the glossary** (`docs/design/settings/glossary.md`): one row per concept with the single English term, the single Arabic term, the forbidden synonyms in each language, and where it is used. Decide each conflict explicitly; do not leave two terms for one thing. Candidates already visible in the strings to settle (check each against the code before deciding):
  - **key / letter / mark / harakat / tashkeel** (counted "keys", unlocked "letters", "marks", "Harakat", Arabic "التشكيل" and "الحركات"): "keys" is what is counted and unlocked ("Keys unlocked", "Keys in Practice", "Time per key"); letters and marks are kinds of key. Use "letter keys" and "mark keys" when a kind matters.
  - **unlock / unlocked / locked** and **reset / start over / erase** and **restore / replace / backup**.
  - **lesson / passage / text / prompt** ("Lesson font", "Ayat per passage", "Text to type") and **recitation / audio / reciter / saved recitations**.
  - **progress / data / statistics / history** ("Reset progress", "Your data", "Stats", "Last ten lessons") and **Settings / Done / Keep my progress / Not now**.
  - **Backspace** as a key name and "correct mistakes" ("Mistake", "wrong key") and **vocalization** (Arabic "التشكيل") against **marks**.
  - Arabic: the same concept must keep one Arabic word, including numbers, "key" (مفتاح), and the names of the three modes.
- [ ] **Step 3: Write the failing tests first.** In `src/i18n/i18n.test.ts` add a table-driven test per glossary decision that reads the message tables and asserts the forbidden term is absent from the listed keys in both languages, with the first row being the case found: no message in the unlock flow (button, question, warning, confirm, done, status) contains "letters" where the count says "keys" ("Unlock all letter keys", "Practice will use every letter key from now on. Mark keys stay locked.", "All letter keys are unlocked."); the Arabic uses "مفاتيح الحروف" and "مفاتيح الحركات" consistently with "المفاتيح المفتوحة". Run them; they fail on today's strings.
- [ ] **Step 4: Make them pass** by editing `en.ts` and `ar.ts` together (same placeholders), then fix every other place that quotes a changed string (specs, README, TECHNICAL, ARIA snapshots later in Task 8). Have the Arabic wording reviewed as "not human verified" in the PR text.
- [ ] **Step 5: Audit by eye in the real app.** Screenshot every page and dialog in English and Arabic at phone and desktop sizes and read the text as a learner would. List any remaining mismatch in the PR text rather than leaving it silent.
- [ ] **Step 6: Commit** `i18n: one vocabulary, keys not letters` with the `simplicity_delta` footer.

**Interfaces:** Produces `glossary.md`, which every later string edit follows.

**Removes:** every synonym the glossary forbids.

## Task 8: Documentation, snapshots, full gate

**Files:**
- Modify: `docs/TECHNICAL.md` (the Settings description and the file map), `README.md` ("What you can do" Settings line, only if the wording is now wrong), `e2e/aria-snapshots.spec.ts-snapshots/*settings*`, `docs/QA-DEVICES.md` (add the manual checks for Settings on a real phone: sheet gestures, keyboard focus and the soft keyboard when a text field is focused)

- [ ] **Step 1:** Update `docs/TECHNICAL.md` to describe the grouped structure, the adapter in `e2e/helpers/pages.ts` and the rule that adding a setting means placing it in a group (and extending the grouping test's table). Commit the approved mock-ups' final PNGs under `docs/design/settings/`.
- [ ] **Step 2:** Regenerate the ARIA snapshots (command in Global Constraints) and read the diff: only intended structure changes.
- [ ] **Step 3: Run `pnpm verify`.** Expected: every step green (check, check:style, build, check:size, typecheck, test, playwright on all projects). If a browser project fails only for a known engine limit, read `e2e/helpers/engines.ts` before touching the test.
- [ ] **Step 4: Commit** `docs: describe the grouped settings`. Tell the user what changed and what was not verified (a real phone, native-speaker Arabic wording).

## Self-review (done when writing this plan)

- **Spec coverage:** scrolling too far -> UX targets 1 and 2, tests in Task 2. Illogical grouping -> UX target 3, Phase 0 round 1 step 3, Task 2 grouping test and Task 4. Design first in rounds, wide then concrete -> Phase 0, tasks 0.2 and 0.3 with explicit stops. `tdd` and `laws-of-simplicity` -> header, "Required skills", every task's loop. Great UX first -> Goal, UX targets, mock-up-before-code rule, user checkpoints.
- **Known gap by design:** Phase 1 names components generically because the right names depend on the design the user picks. Task 0.4 step 2 amends them; nothing in Phase 1 may be started before that step is done.
- **Types and names:** `openSettingsGroup(page, group)` is defined in Task 1 and used with the same signature in Tasks 2 to 6. Setting names match `src/settings/settings.ts`.
