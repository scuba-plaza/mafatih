# Review Feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use the `tdd` and `laws-of-simplicity` skills for every task.

**Goal:** Make it obvious how to start a lesson, make the caret behave like a normal caret, calm the lesson colours and spacing, show which keyboard layout is expected, and add two optional learning aids (fading keyboard hints, unlock all letters).

**Architecture:** All typing UI changes live in `TypingSurface` and `GuideKeyboard`, which Practice, Recitation and Custom share. New behaviour is a pure function where it can be (`activatesOnEnter`, `unlockAllLetters`) and CSS/React state where it cannot. Settings gain two booleans through the existing sanitizer pattern. No new dependencies.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind 4, Vitest (units), Playwright (browser).

**Spec:** The agreed review-feedback design, summarised under "Settled design" below.

## Settled design

1. **Start state.** While the typing field is not focused and the lesson is not complete, the lesson text is blurred (6 px) and a small centred button reads "Click or press Enter to activate…" (touch screens: "Tap to activate…"). Clicking or tapping the text or the button, or pressing Enter while focus is not on a control or in a dialog, activates it. The keyboard guide is not blurred.
2. **Layout label.** "Arabic (101)" (Arabic UI: "العربية (101)") is printed small and muted on the spacebar. Settings, Keyboard guide, gets a hint that names the Mac layout. The wrong-layout alert names the layout.
3. **Caret.** 1.5 px wide, amber, visible only while the field is focused and the lesson is not complete. Solid while typing. After 250 ms without a key it blinks with a gentle fade (1.1 s cycle: solid 440 ms, 110 ms fade out, off 440 ms, 110 ms fade in); never with reduced motion. A wrong key still flashes the caret red and shakes it once per counted error, and it stays red while wrong keys wait for Backspace. Wrong letters are red with no underline.
4. **Text colours.** Typed text `#5b5d61` (new `--color-typed`), untyped text `#8f9299` (`--color-upcoming`). No green.
5. **Spacing.** Text to keyboard 12 px to 36 px (`mt-6` on the guide). Keyboard to finger hint about 0 px to 12 px (`mt-3` on the hint).
6. **Keyboard-guide switches** (Settings, Keyboard guide). "Show letters on the keys", default on: when off, key legends are hidden except on the lit key and on Shift, Backspace, Enter and the layout label. "Show the next key after a pause", default off: the lit key and the finger hint appear after 3 s without a correct key, or at once after a wrong key.
7. **Unlock all letters** (Settings, with confirmation): sets Practice progress to the first mark rung (36), never lowers it, leaves marks locked.

## Global Constraints

- No comments anywhere in code (`pnpm check:style` fails on any). No TypeScript `any`; use `unknown` and guards.
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `~/` is `src/`.
- New messages: add the key to `src/i18n/en.ts` first (it defines `MessageKey`), then `src/i18n/ar.ts`. Same placeholders in both. Arabic strings hold no Latin letters outside placeholders; names that are Latin (the Mac layout name) are passed as placeholder values from a constant.
- Seams: S1 pure units in Vitest, S5 browser in Playwright. There is no jsdom component-test setup, so UI behaviour is tested in the browser. These two seams are the agreed test seams for every task.
- Browser tests: `pnpm build` first (Playwright serves `dist`), then `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test <spec> --project=chromium-desktop`. Never run two Playwright runs at once (they share port 4173). `--project=chromium-mobile` covers phones.
- ARIA snapshots (`e2e/aria-snapshots.spec.ts-snapshots`) are machine-written: after an intended interface change run `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/aria-snapshots.spec.ts --update-snapshots` and read the diff before committing.
- Entry chunk limit 130 KB gzip (`pnpm check:size`). Do not add dependencies.
- Branch `claude/blissful-maxwell-ousv1q`. One commit per task; every commit message ends with the two attribution trailer lines from the session. Open a PR only at the end (Task 8).

## Review Focus

- Enter pressed on a button, link or inside a dialog must not activate the lesson or steal the key. Pinned in Task 1.
- Clicking the audio buttons or pager must not flash the blur (they keep focus today). Pinned in Task 1.
- A caret that is hidden while unfocused must not break the shake animation, the miss colour or scroll centring. Pinned in Task 3.
- Saved profiles and backups made before the new settings exist must restore with the defaults. Pinned in Task 6.
- Unlock all letters must leave marks locked and still produce a full, varied lesson at rung 36 (newest key is the rare `آ`). Pinned in Task 7.

## File Structure

| File | Responsibility |
|---|---|
| `src/typing/activation.ts` (new) | Pure Enter-activation rule plus the DOM helper that says whether a target is a control |
| `src/typing/TypingSurface.tsx` | Blur and activate button, caret visibility and idle blink, mistake styling |
| `src/keyboard/GuideKeyboard.tsx` | Layout label, spacing, label and reveal switches |
| `src/keyboard/useRevealAfter.ts` (new) | Delay hook for the fading hint |
| `src/keyboard/layout101.ts` | Adds the `MAC_LAYOUT_NAME` constant |
| `src/settings/settings.ts`, `SettingsDialog.tsx` | Two new booleans, their sanitizers and switches, the layout hint, the unlock row |
| `src/settings/UnlockLetters.tsx` (new) | Settings row with confirmation, mirrors `ResetProgress.tsx` |
| `src/practice/ladder.ts` | `unlockAllLetters` |
| `src/styles/tokens.css`, `globals.css`, `tokens.test.ts` | Colours and the blink keyframes |
| `src/i18n/en.ts`, `ar.ts` | All new copy |
| `e2e/*.spec.ts`, `src/**/*.test.ts` | Tests, written first in each task |

---

### Task 1: Start state (blur and activate)

**Files:**
- Create: `src/typing/activation.ts`, `src/typing/activation.test.ts`
- Modify: `src/typing/TypingSurface.tsx`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `e2e/typing.spec.ts`, `e2e/audio.spec.ts`, ARIA snapshots

**Interfaces:**
- Produces: `interface ActivationKey { readonly key: string; readonly ctrlKey: boolean; readonly metaKey: boolean; readonly altKey: boolean; readonly repeat: boolean; readonly isComposing: boolean; readonly onControl: boolean }`; `activatesOnEnter(event: ActivationKey): boolean`; `isOnControl(target: EventTarget | null): boolean` (true inside `a[href], button, input, select, textarea, summary, dialog, [contenteditable], [role="button"]` or an element with a tabindex other than -1).
- Messages: `typing.activate` = "Click or press Enter to activate…", `typing.activateTouch` = "Tap to activate…", Arabic equivalents.

- [ ] **Step 1: Write the failing unit tests** in `activation.test.ts`: `activatesOnEnter` is true for `{ key: "Enter" }` with every other field false; false for `"a"`, `"Tab"`, `"PageDown"`; false for Enter with ctrl, meta or alt, with `repeat`, with `isComposing`, and with `onControl: true`.
- [ ] **Step 2:** Run `pnpm exec vitest run src/typing/activation.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `activation.ts` as specified above.
- [ ] **Step 4:** Run the same command. Expected: PASS.
- [ ] **Step 5: Write the failing browser tests** in `e2e/typing.spec.ts` (desktop project; skip on mobile where noted):
  - "while the text is not focused it is blurred and a button offers to activate it": `lessonText` has computed `filter` containing `blur`; `getByRole("button", { name: "Click or press Enter to activate…" })` is visible inside the text region; after `startTyping` the filter is `none` and the button count is 0.
  - "pressing Enter with the page heading focused activates, clicking the button activates, and clicking the text activates": three cases, each ends with the field focused.
  - "Enter on a control or in a dialog does not activate": focus the Settings button and press Enter, the Settings dialog opens and the field is not focused.
  - "leaving the field blurs the text again, and a finished lesson is never blurred": after `page.mouse.click(4, 4)` the filter contains `blur`; after typing the whole text the filter is `none`.
  - Mobile project: the button is named "Tap to activate…".
  - In `e2e/audio.spec.ts`: "playing audio keeps the field focused and the text sharp": after clicking the Play button the field is focused and the filter is `none`.
- [ ] **Step 6:** Run `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/typing.spec.ts e2e/audio.spec.ts --project=chromium-desktop`. Expected: the new tests FAIL.
- [ ] **Step 7: Implement in `TypingSurface.tsx`:** `const paused = !focused && !complete`. Add `blur-[6px]` to the lesson text container while paused. Render a `<button type="button">` while paused, absolutely centred in the section, with two spans (desktop text hidden with `pointer-coarse:hidden`, touch text `hidden pointer-coarse:inline`), styled with the `BUTTON` constant plus `bg-surface`. The existing section click listener already focuses the field, so the button needs no handler of its own. Add a `useEffect` that, while `paused`, listens for `keydown` on `document` and calls `focus()` with `preventDefault()` when `activatesOnEnter(...)` is true (build the argument from the event and `isOnControl(event.target)`).
- [ ] **Step 8:** Rebuild, regenerate the ARIA snapshots, read the diff, then run `typing`, `audio`, `recitation`, `custom`, `practice`, `a11y-matrix`, `aria-snapshots` and `keyboard-walk` specs on both Chromium projects. Expected: PASS. Fix any older test that clicks or checks the unfocused state.
- [ ] **Step 9: Commit** `feat: blur the text until it is activated, with a click, a tap or Enter`.

### Task 2: Layout label

**Files:**
- Modify: `src/keyboard/layout101.ts`, `src/keyboard/GuideKeyboard.tsx`, `src/settings/SettingsDialog.tsx`, `src/typing/TypingSurface.tsx`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `e2e/guide.spec.ts`, any e2e that asserts the old wrong-layout text (`grep -rn "not typing Arabic" e2e`)

**Interfaces:**
- Produces: `export const MAC_LAYOUT_NAME = "Arabic – PC"` in `layout101.ts`. Messages `guide.layout` ("Arabic (101)" / "العربية (101)"), `settings.layoutHint` with `{mac}`, and `typing.wrongLayout` gains `{mac}`.

- [ ] **Step 1: Write the failing browser tests** in `e2e/guide.spec.ts` (desktop only): "the space bar names the layout": `guide.locator('[data-key="Space"]')` has text "Arabic (101)"; in Arabic UI (`seedSettings({ language: "ar" })`) it has "العربية (101)". "Settings explains which layout to choose": the Keyboard guide group contains text matching `/Arabic – PC/`. Add to the existing wrong-layout test (or a new one in `typing.spec.ts`): pressing a Latin key shows an alert that contains "Arabic (101)" and "Arabic – PC".
- [ ] **Step 2:** Run `guide.spec.ts` and `typing.spec.ts`. Expected: FAIL.
- [ ] **Step 3: Implement:** give the Space slot a `layout: true` flag instead of `symbol: ""`; `legendOf` returns the passed layout name for it; use `text-sm` for that slot and drop `lang="ar"` on it. Add the hint paragraph (`text-sm text-muted`) to the Keyboard guide fieldset, and pass `{ mac: MAC_LAYOUT_NAME }` where `typing.wrongLayout` is rendered. Update both message catalogs.
- [ ] **Step 4:** Run `pnpm exec vitest run src/i18n` and the two specs. Expected: PASS.
- [ ] **Step 5:** Regenerate the ARIA snapshots (the Settings dialog changed). **Commit** `feat: name the expected keyboard layout on the space bar, in Settings and in the wrong-layout alert`.

### Task 3: Caret

**Files:**
- Modify: `src/typing/TypingSurface.tsx`, `src/styles/globals.css`, `e2e/typing.spec.ts` and any spec that reads the caret while unfocused (`grep -rn "caret" e2e`)

**Interfaces:**
- Produces: `data-idle` attribute on the caret element; keyframes `caret-blink`; constant `CARET_IDLE_MS = 250` in `TypingSurface.tsx`.

- [ ] **Step 1: Write the failing browser tests** in `e2e/typing.spec.ts`:
  - "the caret is only shown while the text is focused": hidden before `startTyping`, visible after, hidden again after `page.mouse.click(4, 4)`.
  - "the caret is 1.5px wide": computed `width` is `1.5px`.
  - "the caret is solid while typing and blinks with a fade once the typist pauses": right after a key the caret has no `data-idle` and `animation-name: none`; then `expect(caret).toHaveAttribute("data-idle", "")` and `animation-name: caret-blink`, `animation-duration: 1.1s`; pause the animation with `getAnimations()` and set `currentTime` to 100 (opacity 1), 495 (opacity strictly between 0.05 and 0.95) and 700 (opacity 0); typing another key removes `data-idle`.
  - "with reduced motion the caret never blinks": `emulateMedia({ reducedMotion: "reduce" })`, idle caret has `animation-name: none`.
  - "a wrong letter is red and not underlined": the `[data-mistakes]` element has computed `text-decoration-line: none` (this replaces the wavy assertion at the old line 91) and red `color`.
  - Remove the test "while it waits the caret blinks, and while typing or with reduced motion it stands still" (it asserts the old waiting pulse).
- [ ] **Step 2:** Run `typing.spec.ts`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement:**
  - `caret.hidden = !focused || rect === undefined` in the placement effect.
  - A `useState` idle flag reset by an effect keyed on `[doneUntil, mistakes, misses, focused]` that starts a `window.setTimeout(CARET_IDLE_MS)`; render `data-idle`.
  - In `globals.css` replace the `caret-wait` block with `@keyframes caret-blink { 0%, 40% { opacity: 1 } 50%, 90% { opacity: 0 } 100% { opacity: 1 } }` and, inside `@media (prefers-reduced-motion: no-preference)`, `[data-caret][data-idle] { animation: caret-blink 1.1s ease-in-out infinite }`.
  - Replace `w-0.5` with `w-[1.5px]` on the caret.
  - Remove `underline decoration-wavy underline-offset-4` from the mistake span.
- [ ] **Step 4:** Run `typing`, `recitation`, `audio` and `celebration` specs on both projects. Expected: PASS. The existing shake, red and reduced-motion tests must stay green without changes beyond the removed waiting-pulse test.
- [ ] **Step 5: Commit** `feat: a normal caret that is shown while focused and blinks after a pause, and no underline on mistakes`.

### Task 4: Text colours

**Files:**
- Modify: `src/styles/tokens.css`, `src/styles/globals.css`, `src/styles/tokens.test.ts`, `e2e/typing.spec.ts`, `e2e/audio.spec.ts` (if it asserts the old colours)

- [ ] **Step 1: Write the failing tests.** `tokens.test.ts`: remove the `["ink", "upcoming", TEXT]` pair and the `UPCOMING_FLOOR` pair; add `["upcoming", "page", TEXT]`, `["upcoming", "surface", TEXT]`, and `["typed", "page", TYPED_FLOOR]` with `TYPED_FLOOR = 3`. Browser: "typed text is darker than the text still to be typed": the lesson text container's computed `color` is `rgb(143, 146, 153)`, and the `::highlight(mafatih-done)` computed colour after typing one letter is `rgb(91, 93, 97)` (read it the way `e2e/audio.spec.ts` reads highlight colours).
- [ ] **Step 2:** Run `pnpm exec vitest run src/styles` and the typing spec. Expected: FAIL.
- [ ] **Step 3: Implement:** add `--color-typed: #5b5d61`, set `--color-upcoming: #8f9299`, and point `::highlight(mafatih-done)` and `::highlight(mafatih-done-playing)` at `var(--color-typed)`.
- [ ] **Step 4:** Run the unit tests and the typing, audio, recitation and a11y-matrix specs. Expected: PASS. Look at the ayah signs (`--color-apparatus`) in a screenshot and confirm they still read well.
- [ ] **Step 5: Commit** `feat: typed text is darker than the text still to be typed`.

### Task 5: Spacing

**Files:**
- Modify: `src/keyboard/GuideKeyboard.tsx`, `e2e/guide.spec.ts`

- [ ] **Step 1: Write the failing browser test** in `guide.spec.ts`: "there is room between the text and the keyboard, and between the keyboard and the finger hint": the guide's top minus the lesson text's bottom is at least 36; the caption's top minus the space bar's bottom is at least 12.
- [ ] **Step 2:** Run `guide.spec.ts`. Expected: FAIL (12 and 0).
- [ ] **Step 3: Implement:** add `mt-6` to the guide's root classes and `mt-3` to the caption paragraph.
- [ ] **Step 4:** Run `guide`, `recitation` and `practice` specs. Take screenshots at 1366×768 and 1280×720 of Practice and Recitation and confirm the keyboard and, in Recitation, the stats row stay in view. Expected: PASS.
- [ ] **Step 5: Commit** `feat: more space around the keyboard guide`.

### Task 6: Keyboard-guide switches

**Files:**
- Create: `src/keyboard/useRevealAfter.ts`
- Modify: `src/settings/settings.ts`, `src/settings/settings.test.ts`, `src/storage/profile.test.ts`, `src/keyboard/GuideKeyboard.tsx`, `src/typing/TypingSurface.tsx`, `src/settings/SettingsDialog.tsx`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `e2e/guide.spec.ts`, ARIA snapshots

**Interfaces:**
- Produces: `Settings.keyLabels: boolean` (default true, sanitized `raw.keyLabels !== false`) and `Settings.delayedHint: boolean` (default false, `raw.delayedHint === true`); `useRevealAfter(position: string, delayMs: number, immediate: boolean): boolean`; constant `HINT_DELAY_MS = 3000`.
- Messages: `settings.keyLabels` "Show letters on the keys", `settings.delayedHint` "Show the next key after a pause", `settings.delayedHintHint` (the switch hint: the key and finger appear after 3 seconds, or at once after a mistake).

- [ ] **Step 1: Write the failing unit tests.** `settings.test.ts`: defaults are `keyLabels: true`, `delayedHint: false`; `sanitizeSettings({})` and `sanitizeSettings({ keyLabels: "no", delayedHint: "yes" })` give the defaults; `{ keyLabels: false, delayedHint: true }` is kept. `profile.test.ts`: extend the default settings fixture and the key lists with both fields, and assert an old saved profile without them restores with the defaults.
- [ ] **Step 2:** Run `pnpm exec vitest run src/settings src/storage`. Expected: FAIL.
- [ ] **Step 3: Implement** the two fields, defaults and sanitizers.
- [ ] **Step 4:** Run the unit tests. Expected: PASS.
- [ ] **Step 5: Write the failing browser tests** in `guide.spec.ts` (desktop): "with letters off the keys are blank except the lit key and the symbols": after `seedSettings({ keyLabels: false })` the `KeyQ` key has empty text, the lit key `KeyF` has "ب", Shift and Backspace keep their symbols and the space bar keeps "Arabic (101)". "with the delay on nothing is lit at first, and the key and the finger hint appear after three seconds": `dueKeys` is empty and the hint is absent right away; `expect.poll` finds `["KeyF"]` and "Left index finger" within 5 s; typing the right key hides them again. "a wrong key reveals the key at once even with the delay on": after a wrong key `dueKeys` is `["Backspace"]` immediately. "both switches are in Settings and are saved": toggling each persists in `savedSettings`.
- [ ] **Step 6:** Run `guide.spec.ts`. Expected: FAIL.
- [ ] **Step 7: Implement:** `useRevealAfter` resets a `useState(false)` flag in an effect keyed on `[position, delayMs]` and sets it after `delayMs`; it returns `delayMs === 0 || immediate || revealed`. In `GuideKeyboard`, pass `position = \`${session.cursor}:${session.within}\``, `delayMs = delayedHint ? HINT_DELAY_MS : 0`, `immediate = session.missed || session.mistakes.length > 0`; when not revealed use an empty guide (no keys, not shifted, no finger) for lit keys, legends and the caption. Hide a key's legend when `!keyLabels && !due` unless the slot has a symbol or is the layout slot. Add the two props to `GuideKeyboardProps` and pass them from `TypingSurface`. Add the two Switches to the Keyboard guide fieldset (the delay switch with its hint).
- [ ] **Step 8:** Run `guide`, `settings`, `transfer` and `a11y-matrix` specs, then regenerate the ARIA snapshots. Expected: PASS.
- [ ] **Step 9: Commit** `feat: optional key labels and a fading hint for the keyboard guide`.

### Task 7: Unlock all letters

**Files:**
- Create: `src/settings/UnlockLetters.tsx`
- Modify: `src/practice/ladder.ts`, `src/practice/ladder.test.ts`, `src/practice/lesson.test.ts`, `src/settings/SettingsDialog.tsx`, `src/i18n/en.ts`, `src/i18n/ar.ts`, `e2e/settings.spec.ts`, ARIA snapshots

**Interfaces:**
- Produces: `unlockAllLetters(progress: LadderProgress): LadderProgress` and `LETTERS_END` (index of the first mark rung, 36). Messages `settings.unlockLetters`, `settings.unlockQuestion`, `settings.unlockWarning`, `settings.unlockConfirm`, `settings.unlockKeep`, `settings.unlockDone`.

- [ ] **Step 1: Write the failing unit tests.** `ladder.test.ts`: from `{ unlocked: 10 }` the result is `{ unlocked: 36 }`; from 40 it stays 40; applying it twice equals applying it once; `sanitizeProgress` returns the result unchanged; `unlockedMarks({ unlocked: 36 })` is empty. `lesson.test.ts`: with the real word list at `unlocked: 36` and each vocalization, `buildPracticeLesson` returns a prompt with at least 30 typed units and at least 4 distinct words.
- [ ] **Step 2:** Run `pnpm exec vitest run src/practice`. Expected: FAIL.
- [ ] **Step 3: Implement** `unlockAllLetters` and `LETTERS_END` in `ladder.ts`.
- [ ] **Step 4:** Run the unit tests. Expected: PASS. If the lesson test shows short lessons dominated by `آ` words, fix the generator's fallback before continuing.
- [ ] **Step 5: Write the failing browser test** in `settings.spec.ts`: "Unlock all letters asks first, then unlocks every letter and keeps the marks locked": press the button, see the question, choose the keep option and nothing changes (Practice HUD still "10 of 44"); repeat and confirm, the HUD shows "36 of 44" and a status says all letters are unlocked; the button is disabled afterwards.
- [ ] **Step 6:** Run it. Expected: FAIL.
- [ ] **Step 7: Implement** `UnlockLetters.tsx` mirroring `ResetProgress.tsx` (button, `ConfirmChoice`, status line, focus restore), disabled when `ladder.unlocked >= LETTERS_END`, and render it above `ResetProgress` in `SettingsDialog`.
- [ ] **Step 8:** Run `settings`, `practice`, `stats` and `a11y-matrix` specs and regenerate the ARIA snapshots. Expected: PASS.
- [ ] **Step 9: Commit** `feat: unlock all letters in Practice from Settings`.

### Task 8: Docs, full verification, PR

**Files:**
- Modify: `docs/TECHNICAL.md`, `README.md`

- [ ] **Step 1:** Update `docs/TECHNICAL.md`: the Focus design decisions about the start state, the caret and its waiting animation, the mistake underline, the untyped-text contrast waiver (now for typed text) and the finger caption are replaced by what this plan settled; add the layout label and the two switches. Update the README "What you can do" and Settings lists and its "Before you start" layout sentence (mention the Mac name).
- [ ] **Step 2:** Run `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm verify`. Expected: lint, style check, build, size check, typecheck, unit tests and Playwright all PASS. Fix anything red at its root cause.
- [ ] **Step 3: Commit** `docs: describe the new start state, caret, colours and keyboard-guide options`.
- [ ] **Step 4:** Push `claude/blissful-maxwell-ousv1q`, open a PR (summary of the seven changes, the unverified Mac wording, the never-run Firefox and WebKit engines), subscribe to its activity and watch CI. If it is red, read the failing job's logs, fix the cause, push again, and repeat until green.

## Self-review

- Spec coverage: start state (Task 1), layout label (2), caret and mistake underline (3), colours (4), spacing (5), switches (6), unlock all (7), docs and CI (8). Nothing in the settled design is without a task.
- Names used across tasks: `Settings.keyLabels`, `Settings.delayedHint`, `MAC_LAYOUT_NAME`, `CARET_IDLE_MS`, `HINT_DELAY_MS`, `LETTERS_END`, `unlockAllLetters`, `activatesOnEnter` are each defined once and used consistently.
- Open risk named in the PR: Mac layout wording is unverified on a real Mac; Firefox and WebKit have never run for this app, and blur, highlights and Enter handling are the places they could differ.
