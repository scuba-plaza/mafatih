# Settings Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. **Use the `tdd` and `laws-of-simplicity` skills for every task** (see "Required skills"). **Phase 0 (design mock-ups, in rounds, with the user) comes first and no production code changes until the user has approved a design in writing.**

**Goal:** Replace the one very long Settings column with a structure a learner can understand at a glance: settings grouped by what the learner is trying to do, any setting reachable in a couple of taps with little or no scrolling, on phones, desktops, in English and in Arabic. Great UX is the first criterion; every other consideration (code size, effort) comes after it.

**Architecture:** Design first, code second. Phase 0 produces mock-ups in two or three rounds (round 1 wide and different, round 2 concrete) and ends with a "Settled design" section written into this file. Phase 1 builds that design in thin vertical slices behind one small test adapter, so the existing behaviour tests keep guarding every control while the structure around them changes. Behaviour of every setting (what it stores, when it applies, its accessible name) does not change; only where and how it is presented does.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind 4, Vitest (units), Playwright (browser). No new dependencies.

**Spec:** "What is wrong today", "UX targets" and "Settled design" in this file. "Settled design" was written in Task 0.4 from the mock-ups the owner approved, as `2026-11-16-one-screen-layout.md` was.

## Decisions so far (owner, rounds 1 to 3; the verbatim record is `docs/design/settings/feedback.md`)

1. **Structure:** master and detail. Settings stays a dialog over the lesson; no separate page.
2. **Design 2** for phone and desktop. Phone: a push list of groups with their current values; the active section's title is **centred in the middle of the dialog** (back on the start side, Done on the end side). Desktop: three columns (rail, controls, preview column).
3. **Groups, in this order:** General, Lesson, Recitation, Your data. General first. Audio is part of Recitation.
4. **The Lesson group holds the live preview and every setting that changes the lesson's appearance or typing UI:** lesson font, text size, vocalization, correcting mistakes with Backspace, and the keyboard guide switches (desktop only, as today).
5. **"Unlock all letters" leaves Settings and becomes "Unlock all keys" on the Practice page** (in the progress row, next to "Keys unlocked 14 of 44"). It unlocks **all 44 keys, marks (harakat) included**, not just letters. There is no Practice group in Settings.
6. **The preview must be truthful (binding, utmost importance).** See UX target 10 and the Global Constraints. Drift between the preview and the real lesson must be impossible by construction, and tests must prove it.
7. **One vocabulary** across the interface in English and Arabic (UX target 11, Task 11). First case: the app counts and names **keys** everywhere, so the button is "Unlock all keys", never "letters" next to a count of "keys".
8. **Group summaries are one line, on every viewport**, never wrapping, and carry as little as one or two values.
9. **The hint "Asks only for the marks you have unlocked in Practice." is removed** (the Auto option has no hint).

## Settled design (Task 0.4)

Visual source of truth: `docs/design/settings/round3/FINAL.png` (Settings), `TRUTH.png` (how the preview stays truthful), `UNLOCK.png` and `real/unlock-practice-*.png` (Unlock all keys on the real Practice page). Interactive versions were published as artifacts. Measured against the targets: phone 0.84 screens (limit 1.5), tablet 0.74, desktop 0.85 (limit 1.0).

**S1 Structure.** Settings stays the modal dialog opened by the header button (`SettingsButton` > `SettingsDialog` > `ui/Dialog`). Master and detail with four groups. It opens on the first group, General, and its group state lives in memory only.

**S2 Groups, controls and wording (English / Arabic).** Every control is in exactly one group.

| Group | Arabic | Contents (accessible names stay as today unless marked) |
|---|---|---|
| General | عام | **Language** (English, العربية); **About** link |
| Lesson | الدرس | Preview. Section **Text** (النص): **Lesson font** (3 radio chips), **Lesson text size** (slider). Section **Typing** (الكتابة): **Vocalization** (4 options), **Correct mistakes with Backspace** (switch). Section **Keyboard guide** (existing title; only where the guide exists today: width at least 48rem and a fine pointer): Show the keyboard, Show which finger to use, Show letters on the keys, Show the next key after a pause, and the layout hint |
| Recitation | التلاوة | **Ayat per passage** (1 to 4), **Surah order**, **Reciter**, saved recitations (usage line, **Delete saved recitations**) |
| Your data | بياناتك | Section **Backup and restore**: **Download backup**, **Restore from a backup file**. Section **Reset progress**: its explanation (the existing reset warning) and the **Reset progress** button |

Not in Settings any more: Unlock all keys (see S7). Not a setting and not changed: the audio panel on the Recitation page, `customText`, `volume`, `muted`, `playWhole`, `loop`.

**S3 Layouts and navigation.**
- *Under 48rem (phones, narrow windows):* a bottom sheet of fixed height `min(43.75rem, 90dvh)`. It opens on a list of the four groups, one row each: title on the start side, one-line summary and a chevron on the end side. Choosing a row pushes that group; the header shows **back (chevron + "Settings") on the start side, the group's title centred in the dialog, Done on the end side**. In the list the same header shows the title "Settings" centred and no back button. The title is centred by a three-column header grid (`minmax(0,1fr) auto minmax(0,1fr)`), so it stays centred whatever the width of back and Done, and the grid mirrors in right-to-left through logical properties. When the dialog is too narrow for the label (320 px, or large text), back shows only its chevron and keeps its accessible name.
- *48rem and wider:* a centred dialog of fixed height `min(43.75rem, 90dvh)` with the groups as a rail on the start side (each item: title and one-line summary) and the selected group's pane beside it. Width 48.75rem. With a fine pointer and a viewport of at least 64rem the width is 72.5rem (capped at the viewport minus 2rem) and the Lesson group gets a third column holding the preview, the keyboard and the Keyboard guide switches. Without it (a tablet, or a narrower window) the preview is pinned above the pane's controls and the guide switches, where they exist, sit under Typing.
- Header on wide layouts: "Settings" on the start side, Done on the end side.
- The rail is a `nav` of buttons; the selected one has `aria-current="true"`. It is not a tablist (no roving arrow keys).

**S4 Summaries.** One line, always (`truncate`; no wrapping at any width, text size or language), and short: General shows the language's own name; Lesson shows `{font} · {size}`; Recitation shows `{reciter} · {count} ayat`; Your data shows "Backup, restore, reset". The full text stays in the DOM, so the row's accessible name is its title plus its summary even when the summary is visually cut with an ellipsis. Nothing else is summarised.

**S5 The Lesson group and its preview (binding rules in UX target 10).**
- The preview exists only in Lesson. Phone: a slim preview pinned under the header (one line of the lesson surface, 100% size) that opens in place to three lines; it is pinned only when the viewport is at least 36rem high (so large text and short screens, where 36rem is taller, make it scroll with the controls instead). Wide: pinned above the pane, or the third column (S3).
- The preview is the real lesson surface and the real keyboard guide, scaled by one uniform factor `min(1, available width / natural width)` applied to both together (the keyboard's natural width is 660 px). A label "Shown at {percent}%" appears only when the factor is below 1. It never shows explanatory captions of its own: the settings' own hints explain the settings.
- The preview state: a fixed sample sentence (`كِتَابٌ جَدِيدٌ عَلَى الطَّاوِلَةِ وَالقَلَمُ بِجَانِبِهِ`), its first word typed, then one wrong key, all produced by the real session functions. With Backspace correction on the wrong key is drawn as the real surface draws it; with it off the key is blocked, as in the lesson.
- Vocalization options show the chosen option's hint under the control; non-chosen hints stay in the DOM, visually hidden and still linked with `aria-describedby`. **Auto has no hint.** Letters only, Harakat and Full keep theirs.

**S6 Controls that change shape.** Language, Ayat per passage, Surah order, Reciter and Vocalization are segmented controls (radio inputs in a named group). Ayat per passage was a `select` (role combobox) and becomes radios named 1 to 4. Lesson font is three radio chips: each shows the Arabic sample in its own font (kept as `[data-font-sample]`) and the family name.

**S7 Unlock all keys.**
- Where: the Practice page's progress section (`Hud`), at the end of the "Keys unlocked / Newest key / Accuracy / Time per key / Last lesson" row on wide screens and on its own row below the items on a phone. It is hidden whenever the HUD is hidden (phone keyboard up) and when all keys are unlocked (the HUD then says "All keys are unlocked.").
- What it does: `unlockAllKeys` sets `ladder.unlocked` to the number of keys (44), never lowers it, and so unlocks the 36 letters **and** the 8 marks. With Auto vocalization every mark is now typed. The lesson restarts as it does today when progress changes.
- Confirmation: a dialog (not an inline question, which would reflow the one-screen Practice page): title "Unlock all keys?", a "Not now" button in the header (it receives focus: the safe answer), the warning, and an "Unlock" button. Escape and a click outside mean "Not now". After "Unlock" focus goes to the lesson's typing input, as after a finished lesson.
- Strings (English / Arabic): button **Unlock all keys** / **فتح كل المفاتيح**; question **Unlock all keys?** / **فتح كل المفاتيح؟**; warning **Practice will use every key from now on, marks included. Reset progress, in Settings, takes you back to the start.** / **سيستخدم التمرين كل المفاتيح من الآن، بما فيها الحركات. إعادة ضبط التقدم في الإعدادات تعيدك إلى البداية.**; **Not now** / **ليس الآن**; **Unlock** / **افتح**; the existing "All keys are unlocked." (`hud.allUnlocked`) is the result message. Message keys move from `settings.unlock*` to `practice.unlock*`.

**S8 Focus.** Opening: as today (the platform focuses the first control) and closing returns focus to the Settings button. Phone: choosing a group moves focus to the group's title (made focusable with `tabIndex={-1}`) so it is announced; back returns focus to the row that opened the group. Rail: focus stays on the chosen rail button; the pane changes under it. Confirmation flows inside Settings (restore, reset) are unchanged: the safe answer is focused first and the opener gets focus back.

**S9 Targets (confirmed).** Any setting in at most 2 actions; tallest pane at most 1.5 screens at 390 x 844 and at most 1.0 at 1440 x 900; at most 7 groups (there are 4); every control in exactly one group; no new persisted state; the preview is truthful by construction.

**S10 Out of scope.** A separate Settings page, tabs, search, contextual opening, remembering the last group across openings, a Practice group, any change to Recitation's audio panel or to the Stats page.

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

These are proposals. The user confirms or changes them with the round 1 feedback; the confirmed numbers go into "Settled design" and become tests in Tasks 4 and 7.

1. **Reach.** Any setting is reachable from "Settings opened" in at most 2 deliberate actions (tap, click or key press) and is visible without scrolling more than half a screen.
2. **Scroll budget.** The tallest screen/pane/page of Settings is at most 1.5 screens tall at 390x844 and fits without scrolling at 1440x900. (Task 0.1 measures today's number and shows it in round 1, so the improvement is visible.)
3. **Grouping.** Every control belongs to exactly one group. At most 7 groups. Group names are task words a learner uses ("Reading", "Typing", "Keyboard guide", "Recitation", "Your data"), not implementation words. A group has at most about 5 controls.
4. **Order.** Most-used first (language, text size, the typing rules), rare and risky last. Destructive actions (reset, restore) are visually separate, last, and keep today's two-step confirmation.
5. **Understandable without reading.** A control's current value is visible without opening it. Hints appear only for the option that is chosen or being considered, not for all options at once.
6. **Feedback.** A change applies at once (as today, no Save button) and the learner can see its effect: the font and size controls show a live sample at the real size; vocalization shows what the learner will be asked to type.
7. **Orientation.** The learner always knows where they are and how to go back or close. Closing returns focus to the Settings button (as today).
8. **Inclusive by default.** Everything works by keyboard and screen reader, in right-to-left Arabic, at 320 px wide with text at 200%, with forced colours, and with reduced motion. Touch targets stay at least 44 px.
9. **No new persisted state.** The restructure adds no field to the profile (`mafatih:profile:2`), backup file or sanitizers. UI state such as "which group is open" lives in memory. Settings still opens at its top.
10. **The preview is truthful by construction.** There is exactly one implementation of the lesson text and one of the keyboard guide (today `TypingSurface` and `GuideKeyboard`). The preview mounts those same components with the learner's real `settings` and a fixed sample whose state comes from the real functions (`buildPrompt`, `requiredMarks` with the learner's real unlocked marks, `createSession`, `applyKey`). It owns no CSS, no rule and no layout for lesson text or keys. If a component cannot be mounted as is (for example `TypingSurface` also runs page-level fitting and reports to the fit-screen context), the task is to extract the shared display part under green tests and have both the lesson pages and the preview use it, never to copy it. The only preview-specific styling allowed is one uniform scale applied to the whole preview subtree (text and keyboard together), and where it is not 100% it is labelled ("Shown at 60%"). Mechanisms the plan requires (details in the Settled design and Tasks 2, 3 and 6):
    - **One type:** `LessonDisplaySettings = Pick<Settings, ...>` is the only settings type the lesson display components accept; the preview passes the same.
    - **Exhaustive classification:** a `Record<keyof Settings, "lesson-display" | "other">` in `settings.ts`. Adding a setting without classifying it fails `pnpm typecheck`. Every `lesson-display` key has its control in the Lesson group and nothing else is in it (test).
    - **Parity tests in a real browser** (Playwright): for every `lesson-display` setting and each of its values (all fonts, all sizes, all four vocalizations with different unlocked marks, Backspace on and off, keyboard, finger guide, key labels and delayed hint on and off), render the real lesson and the preview from the same settings and assert identical text, identical computed font family and size (after dividing out the uniform scale), identical highlight ranges and colours, identical keyboard keys, legends and lit key. A parity test that only compares the preview with itself is a defect.
    - **Boundary test** (a source-reading Vitest, like `src/practice/boundary.test.ts`): fails if a preview file defines lesson-text or key styles, draws text itself, or imports anything but the shared components and the session functions.
    - **Behaviour that must show truthfully:** a wrong key is drawn as the real surface draws a pending mistake when Backspace correction is on and not drawn (blocked) when it is off; marks the learner must type dim like letters and marks that are not typed keep the apparatus colour, according to the real vocalization rules; the keyboard guide hides or shows exactly as the real one does.
11. **One coherent vocabulary** in every user-facing string, English and Arabic (see Task 11).

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
- **One vocabulary:** new or changed strings use the terms in `docs/design/settings/glossary.md` (written in Task 11 and read before any string is added). "Keys" is the unit the app counts (letter keys and mark keys); never use "letters" for the thing counted as "keys".
- Entry chunk limit 130 KB gzip (`pnpm check:size`).
- Browser tests: `pnpm build` first (Playwright serves `dist`), then `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test <spec> --project=<project> --workers=4`. Never run two Playwright runs at once (port 4173). Headless Chromium hides scrollbars; scroll-extent measurements use `scrollHeight` and `clientHeight`, which are not affected.
- Branch `claude/inspiring-franklin-csy594`. One commit per green slice. Every commit message ends with the two trailer lines `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Co5QwpifPvgjBZJ5SQ2yxA`. Do not open a pull request unless the user asks.

## Review Focus

The input classes this restructure is most likely to break without any test noticing, most likely first. Each is pinned by the task named.

- **The preview drifting from the real lesson** in any setting combination (a font or size that scales differently, a vocalization that dims the wrong marks, a keyboard that shows when the lesson hides it). Pinned by the parity tests of UX target 10.
- A setting that exists but is no longer reachable (forgotten when controls are moved between groups, or hidden on a screen size by a group that is collapsed or off-screen). Pinned in Task 4 (every control found in exactly one named group, by name, on phone and desktop).
- The keyboard guide, which today is hidden on touch and narrow screens (`hidden md:pointer-fine:flex`). The Lesson group must not show an empty "Keyboard guide" section or a preview keyboard where the lesson has none. Pinned in Task 5 and Task 6.
- Unlocking all keys changes what Auto vocalization asks for (every mark). A lesson in progress must restart cleanly and the Practice page must still fit one screen at every size. Pinned in Task 8.
- Arabic and right-to-left: long Arabic group names wrapping, chevrons and back arrows pointing the wrong way, the rail and the three-column preview layout. Pinned in Task 10.
- Focus: after drilling into a group, choosing a rail item, restoring a backup or answering a confirmation, focus must land somewhere sensible (never on `body`, never on a removed element). `BackupRestore` already restores focus to its file input; keep that. Pinned in Task 9.
- Small and large text: 320 px wide with text at 200%, and the largest lesson text size, must not clip a control or put Done out of reach. Pinned in Task 10.

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
- The full gate `pnpm verify` runs once, in Task 12. It must be green before anything is called done.

## Review checkpoints

At the end of Task 4, Task 6 and Task 10, stop, take real-app screenshots with Playwright at 1440x900 (desktop), 390x844 (phone) and 320x568 with text at 200%, device scale 2, English and Arabic, with the approved mock-up beside each, and show them to the user. Apply their feedback before continuing. Then spawn a fresh review sub-agent (model `sonnet`, effort `medium`; if unavailable, run the same brief yourself as an adversarial reviewer over the diff since the previous checkpoint). Brief: "Review only the changes since the previous checkpoint against the approved mock-ups, the UX targets and the Review Focus list in docs/superpowers/plans/2026-11-23-settings-restructure.md. Assume the code is wrong until you have tried to break it; run it with `pnpm dev` and Playwright. Prioritise UX and fidelity to the mock-ups, then accessibility, correctness, test quality (implementation-coupled or tautological tests are findings), simplicity (dead code, speculative options, anything removable), and en/ar parity. Report findings only, as `[severity] file:line - finding - how to reproduce - suggested fix`. Do not edit files." The main agent fixes every finding, test-first when it is a behaviour, in a commit `Address review of checkpoint N`.

---

# Phase 0: Design with the user (mock-ups, in rounds)

**Status: complete.** Rounds 1 to 3 are done (`docs/design/settings/round1`, `round2`, `round3`, feedback in `feedback.md`). Task 0.4 is satisfied by "Decisions so far", "Settled design" and the rewritten Phase 1 below; it still needs the owner to confirm the amended plan before any code is written.

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

Work in vertical slices on `claude/inspiring-franklin-csy594`. Run the checks in "Verification" after every slice. Task numbers are the order of work.

## File structure

- `src/ui/Dialog.tsx` (only Settings uses it): gains optional `leading?: ReactNode` (the back button, start side), `titleAlign?: "start" | "center"` (default `"start"`), `className?: string` (appended to the dialog) and `bodyClassName?: string` (replaces the body's default padding and gap), and renders its header as a three-column grid. Existing behaviour is unchanged for defaults.
- `src/ui/Segmented.tsx`: option gains `hint?: string`. The chosen option's hint is shown under the control; every option's hint is in the DOM, visually hidden unless chosen, and each radio is linked to its own with `aria-describedby`.
- `src/ui/ConfirmDialog.tsx` (new): `{ open, question, warning, keepLabel, confirmLabel, onAnswer(confirmed: boolean) }`, built on `Dialog` with `closeLabel={keepLabel}`.
- `src/settings/groups.ts` (new): `GROUP_IDS = ["general", "lesson", "recitation", "data"] as const`, `type GroupId`, and `GROUP_TITLE: Record<GroupId, MessageKey>`.
- `src/settings/SettingsDialog.tsx`: becomes the shell (state `group: GroupId | null`; `null` is the phone list; wide layouts treat `null` as `"general"`). It renders no controls itself.
- `src/settings/GroupList.tsx`, `src/settings/GroupRail.tsx` (new): the phone list and the wide rail, both showing `GroupSummary` rows.
- `src/settings/GeneralSettings.tsx`, `LessonSettings.tsx`, `DataSettings.tsx` (new); `src/recitation/RecitationSettings.tsx` takes over the audio controls (`AudioSettings.tsx` stays as its sub-block).
- `src/settings/FontPicker.tsx` (new): three radio chips.
- `src/settings/LessonPreview.tsx`, `previewSession.ts`, `PreviewScale.tsx` (new).
- `src/settings/settings.ts`: `DISPLAY_SETTING_KEYS`, `LessonDisplaySettings`, `SETTING_KIND`.
- `src/practice/ladder.ts`: `unlockAllKeys` replaces `unlockAllLetters`; `LETTERS_END` is deleted. `src/practice/UnlockAllKeys.tsx` (new) is rendered by `Hud.tsx`. `src/settings/UnlockLetters.tsx` is deleted.
- `e2e/helpers/pages.ts`: `openSettingsGroup`. New specs: `e2e/settings-layout.spec.ts`, `e2e/preview-parity.spec.ts`.

## Task 1: One adapter between the specs and the layout (pure refactor)

**Files:** Modify `e2e/helpers/pages.ts`, and every spec that opens Settings: `settings.spec.ts` (local `opener`, `dialog`, `openSettings`, `closeSettings` at lines 14 to 26), `transfer.spec.ts`, `guide.spec.ts` (around lines 319 and 333), `shell.spec.ts` (332), `site.spec.ts` (89), `practice.spec.ts` (126, 224), `audio.spec.ts` (805, 929), `recitation-map.spec.ts` (84), `reduced-motion.spec.ts`, `a11y-matrix.spec.ts`.

**Interfaces:** Produces `openSettingsGroup(page: Page, group?: "General" | "Lesson" | "Recitation" | "Your data"): Promise<Locator>`. Now it opens Settings if needed and returns the dialog locator. Task 4 makes it also choose the group (a row tap on a phone, a rail click on wide layouts) and return the locator of that group's pane.

- [ ] **Step 1: Failing test.** In `e2e/settings.spec.ts`: `openSettingsGroup opens Settings and returns a locator that contains the Lesson font radios`, asserting `getByRole("radio", { name: "Amiri" })` is visible inside the result. Fails: the export does not exist.
- [ ] **Step 2: Run it** (`pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/settings.spec.ts -g "openSettingsGroup" --project=desktop`) and see the failure.
- [ ] **Step 3: Implement the helper and migrate** every listed spec to it without changing any assertion.
- [ ] **Step 4: Run** the migrated specs on the `desktop` and `phone` projects; all pass.
- [ ] **Step 5: Commit** `test: reach Settings controls through one helper`.

**Removes:** the repeated open-Settings snippets.

## Task 2: Classify every setting; one type for the lesson display (S1 tests)

**Files:** Modify `src/settings/settings.ts`, `src/settings/settings.test.ts`, `src/typing/TypingSurface.tsx` (the `settings` prop type only).

**Interfaces:** Produces `DISPLAY_SETTING_KEYS = ["font", "fontSize", "vocalization", "requireBackspace", "showKeyboard", "fingerGuide", "keyLabels", "delayedHint"] as const`; `type LessonDisplaySettings = Pick<Settings, (typeof DISPLAY_SETTING_KEYS)[number]>`; `SETTING_KIND: Readonly<Record<keyof Settings, "lesson-display" | "other">>`.

- [ ] **Step 1: Failing tests** in `settings.test.ts`: `every setting is classified` (`Object.keys(defaultSettings([])).sort()` equals `Object.keys(SETTING_KIND).sort()`) and `the lesson-display settings are exactly the eight the lesson shows` (the sorted keys of `SETTING_KIND` whose value is `"lesson-display"` equal the literal `["delayedHint","fingerGuide","font","fontSize","keyLabels","requireBackspace","showKeyboard","vocalization"]`).
- [ ] **Step 2: Implement** the three exports; `TypingSurfaceProps.settings` becomes `LessonDisplaySettings` (callers still pass a `Settings`).
- [ ] **Step 3: Run** `pnpm typecheck && pnpm test`. Adding a field to `Settings` without classifying it must fail the type check: check it by hand once and say so in the commit message.
- [ ] **Step 4: Commit** `feat: classify settings; one type for the lesson display`.

## Task 3: Make the real lesson surface mountable beside a real lesson (spike, then extraction)

The risk of the whole work lives here. `TypingSurface` (509 lines) paints text with the CSS Custom Highlight API under global names (`mafatih-done`, `mafatih-apparatus`, and so on; see `HIGHLIGHT_NAMES` in `src/typing/paint.ts` and the `::highlight()` rules in `src/styles/globals.css`), listens on `document` for `keydown` (activation on Enter), takes focus, fits itself to the page (`useStageFit`, `useReportFitMinHeight`, `useChrome`), and renders live regions. A preview opened over a lesson page puts two surfaces on one page.

**Files:** Modify `src/typing/TypingSurface.tsx` (and the smallest set of siblings it needs), `src/typing/paint.ts`, `src/styles/globals.css`; Create `docs/design/settings/spike-notes.md`.

**Acceptance (every item pinned by a test in Task 6 and by the existing suite staying green):**
1. Two surfaces on one page paint independent highlights. Highlight names get a per-instance scope; every `::highlight()` rule lists both scopes in **one selector list**, so the two sets of names can never carry different styles.
2. A read-only instance does not take focus, does not listen for keys, is not announced (no live regions), and is `inert`.
3. It does not report to the fit-screen context and does not hide or show the guide by page space: it takes a fixed text window (a number of lines) instead of fitting.
4. The painting and markup of the text and of the guide are the same code for both modes. A mode flag may switch wiring off; it must not switch any painting or class name.

- [ ] **Step 1: Spike (time-boxed to one sitting).** Mount the real `TypingSurface` with a stub `Trainer` (built from `buildPrompt`, `createSession`, `applyKey`) inside a `<dialog>` on top of a real Practice lesson, in a scratch page. Write down in `spike-notes.md` what breaks, per acceptance item. If mounting as is cannot meet the four items, extract the shared display part (the text paragraphs, caret, highlights and the guide hand-off) into one component that both the lesson pages and the preview render. **Never copy it.**
- [ ] **Step 2: Characterize before changing.** With the existing pixel helper (`e2e/helpers/pixels.ts`), capture the lesson surface for a seeded Custom lesson at the three font sizes 28, 40, 72 and the three fonts, and keep them as the baseline for this task.
- [ ] **Step 3: Refactor in small green steps** until the four items hold. After each step run `typing`, `ligatures`, `ligature-census`, `perf`, `fit`, `scrollbar`, `reduced-motion` specs. The captured pixels must be identical at the end.
- [ ] **Step 4: Commit** `refactor: lesson surface can be mounted read-only beside a lesson` with the `simplicity_delta` footer.

**Removes:** anything the extraction makes redundant. No duplicate of the surface may exist afterwards.

## Task 4: The shell, with every control moved as it is (first slice)

**Files:** Modify `src/ui/Dialog.tsx`, `src/settings/SettingsDialog.tsx`, `e2e/helpers/pages.ts`, `src/i18n/en.ts`, `src/i18n/ar.ts`; Create `groups.ts`, `GroupList.tsx`, `GroupRail.tsx`, `GeneralSettings.tsx`, `LessonSettings.tsx`, `DataSettings.tsx`; Modify `RecitationSettings.tsx`; Create `e2e/settings-layout.spec.ts`.

**Interfaces:** Consumes `openSettingsGroup` (Task 1). `openSettingsGroup(page, group)` now also selects the group and returns that group's pane locator (and, on a phone, it returns to the list first). New messages: `settings.group.general|lesson|recitation|data` (English: General, Lesson, Recitation, Your data; Arabic: عام, الدرس, التلاوة, بياناتك), `settings.text` (Text / النص), `settings.typing` (Typing / الكتابة), `settings.summary.recitation` (`{reciter} · {count} ayat` / `{reciter} · {count} آيات`), `settings.summary.data` (Backup, restore, reset / نسخ، استعادة، إعادة ضبط).

- [ ] **Step 1: Red tests** in `e2e/settings-layout.spec.ts`, using `openSettingsGroup`. Each fails against today's dialog.
  - `Settings opens on a list of four groups, each with a one-line summary` (phone project): the rows are, in order, General, Lesson, Recitation, Your data; each summary's height is below 1.6 times its line height at 390 x 844 and at 320 x 568 with `WIDE_LARGE_TEXT`-style large text.
  - `the title is centred in the dialog` (phone project, English and Arabic): the centre x of the heading is within 1 px of the centre x of the dialog, in the list and in each group.
  - `every control is in exactly one group` (table-driven from S2: group name to the accessible names of its controls). Unlock all keys is not in the table. A final count asserts no control is found outside a group.
  - `any setting is reachable in at most two actions` (count the taps or clicks `openSettingsGroup` performs; expose the count through its return value only if needed).
  - `the tallest group fits the budget`: at 390 x 844 the tallest pane's `scrollHeight / clientHeight` is at most 1.5; at 1440 x 900 it is at most 1.0. Mark this one `test.fixme` until Task 7 and say so.
  - Change `the dialog always opens at its top` to `Settings always opens on the first group at its top`.
- [ ] **Step 2: Implement `Dialog` changes and the shell** (S3). Move the old inline blocks unchanged into `GeneralSettings` (Language radios, About link), `LessonSettings` (language excluded: font, size, vocalization, Backspace, keyboard guide), `RecitationSettings` plus `AudioSettings`, and `DataSettings` (`BackupRestore`, `ResetProgress`). `UnlockLetters` stays in Data until Task 8. Add `GroupSummary` and the one-line `truncate` rule (S4).
- [ ] **Step 3: Run** `settings-layout`, `settings`, `transfer`, `guide`, `audio`, `recitation-map`, `practice`, `shell`, `site` specs on `desktop` and `phone`. Existing behaviour specs pass unchanged except where they open Settings; ARIA snapshots will differ (read, do not update yet).
- [ ] **Step 4: Commit** `feat: Settings opens as a list of groups`.
- [ ] **Checkpoint 1.** Screenshots at 1440 x 900, 390 x 844 and 320 x 568 (large text), English and Arabic, beside `round3/FINAL.png`. Show the owner and wait.

**Removes:** the single long column.

## Task 5: The Lesson group's controls

**Files:** Create `FontPicker.tsx`; Modify `Segmented.tsx`, `LessonSettings.tsx`, `src/i18n/en.ts`, `ar.ts` (delete `vocalization.autoHint`), `e2e/settings.spec.ts`.

- [ ] **Step 1: Red tests** (`e2e/settings.spec.ts`, `settings-layout.spec.ts`):
  - `Vocalization shows the hint of the chosen option and Auto has none`: with Auto chosen no hint text is visible and Auto has no accessible description; choosing Letters only shows "Marks are shown but not typed."; Harakat shows "Type fatha, damma, kasra, shadda and sukun."; Full shows "Type every mark, tanween included."; every non-chosen option still has its accessible description.
  - `Lesson holds exactly the eight lesson-display controls` (derive the expected names from `DISPLAY_SETTING_KEYS` through a literal table in the spec: Lesson font, Lesson text size, Vocalization, Correct mistakes with Backspace, and the four Keyboard guide switches) and nothing else.
  - `the font choice is three radio chips named by family, each showing the sample in its own font` (keep the `[data-font-sample]` assertions of `settings.spec.ts:180`, `perf.spec.ts:96`, `site.spec.ts:92`).
  - `there is no Keyboard guide section on a phone or on a touch tablet` and `there is one on a wide screen with a fine pointer`.
- [ ] **Step 2: Implement** `FontPicker`, the `Segmented` hint behaviour, the Lesson sections (Text, Typing, Keyboard guide) and delete the Auto hint.
- [ ] **Step 3: Run** the affected specs on both projects; commit `feat: Lesson group controls`.

## Task 6: The truthful preview (S5 and UX target 10)

**Files:** Create `src/settings/previewSession.ts`, `previewSession.test.ts`, `LessonPreview.tsx`, `PreviewScale.tsx`, `e2e/preview-parity.spec.ts`; Modify `LessonSettings.tsx`, `src/i18n/*` (`settings.preview`, `settings.previewScale` with `{percent}`; Arabic: معاينة, بحجم {percent}٪).

**Interfaces:** Produces `PREVIEW_TEXT` (the sample, S5) and `previewSession(options: { vocalization: Vocalization; unlockedMarks: ReadonlySet<string>; requireBackspace: boolean }): Session`, built only with `buildPrompt`, `requiredMarks`, `createSession` and `applyKey`. Consumes the Task 3 read-only surface. `<LessonPreview settings: LessonDisplaySettings />` reads the learner's real unlocked marks from the profile and renders the real surface and guide. `<PreviewScale>` applies one uniform scale and renders the label only below 100%.

- [ ] **Step 1: Red unit tests** (`previewSession.test.ts`, expectations are independent literals): the next required key is `ج` after the typed first word in every mode (`expectedText(previewSession(...))`); the typed prefix needs 5 keys for `letters`, 7 for `harakat`, 8 for `full`, 5 for `auto` with no marks unlocked and 8 for `auto` with all marks unlocked (count the keys the session accepted); `view(session).mistakes` is `"ب"` when `requireBackspace` is true and `""` when false.
- [ ] **Step 2: Red parity tests** (`e2e/preview-parity.spec.ts`, real browser). The real lesson is the Custom page seeded with `customText = PREVIEW_TEXT`, with the same prefix typed through real keys. For each case, read from both surfaces a normalised snapshot (text content, computed font family, computed font size divided by the preview's scale, the painted highlight ranges and their colours, the mistake text and colour, the caret colour, the keyboard's keys, legends, lit key and finger text) and assert deep equality. Cases, table-driven: every font x sizes 28, 40, 72 x all four vocalizations (Auto with 10 and with 44 keys unlocked) x Backspace on and off; the four keyboard switches in all 16 combinations (wide project). A test that compares the preview with itself, or with a copy of the expected values written from the implementation, is a defect.
- [ ] **Step 3: Red isolation and behaviour tests:** `opening Settings and changing a setting does not change the lesson behind it except as the setting says` (type three keys, open Settings, assert the lesson's highlights are unchanged, change the font, assert the lesson changed its font only); `keys pressed while Settings is open do not move the preview and Enter does not activate the lesson behind it`; `the preview is inert, not focusable and not announced`; `the label "Shown at N%" appears exactly when the scale is below 1 and N equals the rounded scale`; `on a phone the preview opens from one line to three and is pinned only when the viewport is at least 36rem high`; `with Backspace correction off the preview shows no mistake, with it on it shows the mistake`.
- [ ] **Step 4: Implement** `previewSession`, `LessonPreview`, `PreviewScale` and place them: phone peek, pinned above the pane (wide), third column (wide with a fine pointer, at least 64rem) holding the preview, the keyboard and the Keyboard guide switches.
- [ ] **Step 5: Add the boundary test** `src/settings/preview.boundary.test.ts` (read the sources, like `src/practice/boundary.test.ts`): no file in the preview set contains `fontFamily`, `fontSize`, `text-center`, `leading-`, `::highlight`, a colour token for lesson text or a key class; its imports are limited to the shared lesson components, the session and prompt functions, the profile hook and the types. It fails today's code if you add such a line (try it once).
- [ ] **Step 6: Run** `preview-parity`, `typing`, `settings-layout` on both projects and `pnpm test`; commit `feat: truthful live preview in Lesson`.
- [ ] **Checkpoint 2.** Screenshots of the preview in every layout beside `round3/FINAL.png`, English and Arabic, and the parity matrix result. Show the owner and wait.

## Task 7: Recitation and Your data

**Files:** Modify `RecitationSettings.tsx`, `AudioSettings.tsx`, `DataSettings.tsx`, `e2e/recitation-map.spec.ts` (line 237), `e2e/audio.spec.ts`, `e2e/settings-layout.spec.ts` (remove the `fixme`).

- [ ] **Step 1: Red tests:** `Ayat per passage is four radios named 1 to 4` (replaces the combobox test; the chosen value still saves as `ayatPerLesson`); `Surah order and Reciter keep their option hints` (Mushaf order: "From Al-Faatiha to An-Naas."; Murattal: "Measured and paced for learning."); `saved recitations shows its usage line and Delete saved recitations with their status messages` (keep `audio.usage`, `audio.deleted`, `audio.notDeleted`); `Your data shows the reset explanation before the Reset progress button` (text equal to `settings.resetWarning`); the budget test from Task 4 becomes active and must pass.
- [ ] **Step 2: Implement** with `Segmented` and compact blocks; keep `ConfirmChoice` flows and focus behaviour for restore and reset untouched.
- [ ] **Step 3: Run** `settings`, `settings-layout`, `audio`, `recitation-map`, `transfer` on both projects; commit `feat: Recitation and Your data groups`.

## Task 8: Unlock all keys on the Practice page (S7)

**Files:** Modify `src/practice/ladder.ts`, `ladder.test.ts`, `lesson.test.ts`, `Hud.tsx`; Create `src/ui/ConfirmDialog.tsx`, `src/practice/UnlockAllKeys.tsx`; Delete `src/settings/UnlockLetters.tsx`; Modify `src/i18n/en.ts`, `ar.ts`, `e2e/practice.spec.ts` (the test at line 250), `e2e/fit.spec.ts`, `docs/TECHNICAL.md` (line 152), `README.md`.

**Interfaces:** Produces `unlockAllKeys(progress: LadderProgress): LadderProgress`. Messages `practice.unlock`, `practice.unlockQuestion`, `practice.unlockWarning`, `practice.unlockKeep`, `practice.unlockConfirm` (S7 wording) replace `settings.unlock*`.

- [ ] **Step 1: Red unit tests** (`ladder.test.ts`): `unlockAllKeys from 10 unlocked gives 44`; `never lowers progress`; `unlocks the 8 marks` (`unlockedMarks(unlockAllKeys(initialProgress())).size` is 8); `Auto then requires every mark` (`requiredMarks("auto", unlockedMarks(...)).size` is 8). In `lesson.test.ts`: `with 44 keys unlocked and Auto vocalization the lesson requires all eight marks`.
- [ ] **Step 2: Red browser tests** (`practice.spec.ts`, replacing the old test): `Unlock all keys asks first, then unlocks all 44 keys including the marks` (seed 10 unlocked; the HUD shows "10 of 44"; the button opens a dialog named "Unlock all keys?" described by text containing "marks included"; "Not now" is focused; choosing it closes the dialog, changes nothing and returns focus to the button; choosing "Unlock" saves `{ unlocked: 44 }`, the HUD shows "44 of 44" and "All keys are unlocked.", the button is gone, and focus is in the typing input); `Unlock all keys is hidden when the HUD is hidden` (phone keyboard up) and `is not in Settings`; in `fit.spec.ts`: `the Unlock all keys button keeps the Practice page on one screen at every matrix size` (seed 10 unlocked so the button is present).
- [ ] **Step 3: Implement** `unlockAllKeys` (delete `unlockAllLetters` and `LETTERS_END`), `ConfirmDialog`, `UnlockAllKeys` in `Hud` (end of the row on wide screens, its own row on a phone), the new messages (delete `settings.unlock*`), and remove `UnlockLetters` from `DataSettings`. Update TECHNICAL ("Unlock all keys (Practice page)") and README.
- [ ] **Step 4: Run** `practice`, `fit`, `a11y-matrix`, `settings-layout`, `typing` on both projects and `pnpm test`; commit `feat: Unlock all keys unlocks every key, on the Practice page`.

**Removes:** `UnlockLetters.tsx`, `unlockAllLetters`, `LETTERS_END`, `settings.unlock*`.

## Task 9: Navigation behaviour, focus and keyboard (S8)

- [ ] **Step 1: One failing test, then the fix, for each** (`settings-layout.spec.ts`, `settings.spec.ts`): `Escape, Done and a click outside close Settings from any group and return focus to the Settings button` (extend the existing test); `choosing a group moves focus to its title and back returns focus to that group's row` (phone); `the rail marks the chosen group with aria-current and keeps focus on it` (wide); `the Tab walk through Settings visits every control once and reaches Done` (extend `keyboard-walk.spec.ts`); `restoring a backup and resetting progress keep focus inside the group` (existing behaviour, now from inside a pane); `a status or alert inside a group is announced once`.
- [ ] **Step 2: Commit** after each green slice.

## Task 10: Responsive, Arabic, large text, motion

- [ ] **Step 1: One failing test, then the fix, for each:** `in Arabic the list, the rail, the back arrow, Done and the preview column mirror` (screenshot-free: compare bounding boxes against the English layout mirrored); `at 320 px with text at 200% nothing is clipped, Done is reachable, back keeps only its arrow with its accessible name, and the preview scrolls with the controls instead of being pinned`; `at the largest text size the preview and the font chips do not overflow their boxes`; `a landscape phone with a display cutout keeps the list and header out of the cutout` (extends the existing test); `with forced colours the chosen group, the chosen segment and the chosen font chip are distinguishable`; `with reduced motion nothing in Settings moves when the group changes` (and any transition sits inside the no-preference query or has a `motion-reduce:` class); `axe finds no violations in the list, in each group, on phone and desktop, in English and Arabic`.
- [ ] **Step 2: Commit** after each green slice.
- [ ] **Checkpoint 3.** The full set of screenshots beside the mock-ups, English and Arabic, and the Practice page with the new button. Show the owner and wait.

## Task 11: One vocabulary across the interface (English and Arabic)

The owner found "Keys unlocked 14 of 44" next to a button "Unlock all letters". That case is fixed in Task 8 ("keys"). This task audits the rest, before the documentation task because it changes strings.

**Files:** Create `docs/design/settings/glossary.md`; Modify `src/i18n/en.ts`, `src/i18n/ar.ts`, `src/i18n/i18n.test.ts`, `README.md`, `docs/TECHNICAL.md`, and the specs that assert strings.

- [ ] **Step 1: Inventory** every user-facing string, grouped by concept: all of `en.ts`, text that bypasses `t()` (Language radio labels, font names, Done and Settings), and every `aria-label`, `title` and status message, on every page, dialog and the audio player.
- [ ] **Step 2: Write the glossary** (one row per concept: the one English term, the one Arabic term, the forbidden synonyms in each language, where used). Decide each conflict explicitly. Candidates to settle after checking the code: key, letter, mark, harakat, tashkeel, vocalization; unlock, locked, reset, restore, replace, backup; lesson, passage, text, prompt; recitation, audio, reciter, saved recitations; progress, data, statistics, history; Settings, Done, Keep my progress, Not now; Backspace, mistake, wrong key; and in Arabic one word per concept, including "key" (مفتاح), the three modes and numbers.
- [ ] **Step 3: Failing tests first** in `i18n.test.ts`: a table with one row per glossary decision asserting that the forbidden term is absent from the listed message keys in both languages. The first row is the case found: no message in the unlock flow uses "letters" where the progress count says "keys".
- [ ] **Step 4: Make them pass** by editing `en.ts` and `ar.ts` together (same placeholders), then every place that quotes a changed string (specs, README, TECHNICAL).
- [ ] **Step 5: Read the real app** in English and Arabic at phone and desktop sizes, page by page, as a learner would; list any mismatch that remains in the PR text. Say that the Arabic wording is not human verified.
- [ ] **Step 6: Commit** `i18n: one vocabulary`.

## Task 12: Documentation, snapshots, full gate

**Files:** Modify `docs/TECHNICAL.md` (the Settings description, the file map, the unlock line, a section "The Settings preview is the real lesson surface" listing the mechanisms of UX target 10), `README.md` (the Settings line), `docs/QA-DEVICES.md` (Settings on a real phone: sheet gestures, the centred title with a notch, focus and the soft keyboard; the preview with the system's text size), `e2e/aria-snapshots.spec.ts-snapshots/*settings*`.

- [ ] **Step 1: Update the documents.** Copy the final mock-ups' PNGs into `docs/design/settings/` (already committed).
- [ ] **Step 2: Regenerate the ARIA snapshots** (command in Global Constraints) and read the diff: only the intended structure changes.
- [ ] **Step 3: Run `pnpm verify`.** Every step must be green. If a browser project fails only for a known engine limit, read `e2e/helpers/engines.ts` before touching a test.
- [ ] **Step 4: Commit** `docs: describe the grouped Settings and the truthful preview`. Tell the owner what was and was not verified (a real phone; native-speaker Arabic).

## Self-review (done when amending the plan, Task 0.4)

- **Spec coverage:** scrolling too far and no logical grouping: S2, S3, Task 4 and Task 7 (budget and grouping tests). Master and detail with the title centred, General first: S3, Task 4. One-line summaries: S4, Task 4. No Auto hint: S5, Task 5. Preview only in Lesson with every setting that changes it: S2, S5, Tasks 2, 5, 6. Truthful preview: UX target 10, Tasks 2, 3, 6. Unlock all keys unlocking harakat too, on the Practice page: S7, Task 8. One vocabulary: UX target 11, Task 11. `tdd` and `laws-of-simplicity`: header and "Required skills".
- **Names and types:** `openSettingsGroup`, `LessonDisplaySettings`, `SETTING_KIND`, `previewSession`, `unlockAllKeys`, `ConfirmDialog` are defined once and used with the same signatures later.
- **Known risk:** Task 3 (the real surface was not built to be mounted twice on one page). It is a spike with acceptance items, not a guess; if it needs an extraction, the extraction is part of the task.
- **Assumptions to confirm with the owner:** Settings opens on General each time; the wide three-column layout needs a fine pointer and at least 64rem; the Unlock dialog uses a header "Not now"; Ayat per passage becomes four radios; the summaries are as in S4.
