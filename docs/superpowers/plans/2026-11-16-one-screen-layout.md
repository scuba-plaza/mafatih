# One-Screen Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Use the `tdd` and `laws-of-simplicity` skills for every task: red test first, smallest change that turns it green, then remove anything the test does not need.

**Goal:** On the three typing views (Recitation passage, Practice, Custom practice) everything the learner needs fits on one screen at every common size, with or without a soft keyboard, and the leftover space is split evenly around the text instead of stranded between the text and the audio player.

**Architecture:** The shell becomes exactly one viewport high on typing views only, through a small context that those views switch on while they are mounted. The passage window is the one flexible element: it shrinks, shows whole lines, and scrolls inside itself with no scrollbar. Everything else keeps its natural height. The text, keyboard guide and live stats sit in a centred "stage". What can be a pure function (stage arithmetic, phone and keyboard rules) is one, tested in Vitest; the rest is tested in real browsers.

**Tech Stack:** React 19, TypeScript (strict), Vite, Tailwind 4, Vitest (units), Playwright (browser).

**Spec:** "Settled design" below. It comes from the viewport investigation, the iPhone 12 mini screenshot and the mock-ups the user approved on 2026-11-16 (sheets 1 to 6).

## Settled design

1. **Scope.** Fit mode applies to the Recitation passage view, the Practice view and the Custom practice view. The surah map, Stats, About and the Custom text form keep scrolling like ordinary pages.
2. **One screen.** In fit mode the shell is `h-dvh` and is **not** `overflow-hidden` (so a layout that fails to fit shows up as page scroll, which the tests catch). The grid rows are header, banner, main (`minmax(0,1fr)`), tab bar. On phones the tab bar is a grid row, not `fixed`, and `main` no longer reserves 5rem for it. Every flex ancestor between `main` and the passage window has `min-h-0`.
3. **Stage.** Text window, keyboard guide and live stats sit in one centred flex column (`data-stage`, `flex-1 min-h-0 justify-center gap-3`). Spare space is split above and below. Text is **not** scaled up on big screens.
4. **Passage window.** No `max-h`. Minimum two lines (`min-h-[calc(4em+0.75rem)]`, the container font size is set inline and line height is `leading-[2]`). It scrolls inside itself and its scrollbar is removed entirely: `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`. It stays a keyboard-focusable "Scrollable text" region when it really overflows. When it overflows, its height is a whole number of lines, so no line is ever cut in half, and the caret line is kept on the second row (first row when the window holds fewer than three lines).
5. **Spacing.** Text window to keyboard guide: `clamp(2rem, 5dvh, 3.5rem)` (38 px at 768 px high, 54 px at 1080 px). Keyboard to finger hint: 12 px (`mt-3`).
6. **Keyboard guide hides** when the window cannot keep two lines next to it (it is not squeezed or overlapped). Roughly: laptops with less than about 700 px of page height lose the guide, taller screens keep it.
7. **Phones with the soft keyboard up.** A phone is a coarse pointer whose smaller screen side is under 600 CSS px. The header row (wordmark, nav, settings) is hidden; its safe-area top padding stays. Tablets, laptops and desktops keep the header. The tab bar is already hidden while the keyboard is up. On Apple touch devices `main` reserves 64 px at the bottom (the floating `^ v ✓` bar covers about 58 px and cannot be measured or removed). When the visible height is under 320 px (landscape phone) the pager, player and live stats are hidden as well and the window minimum drops to one line.
8. **Wording rule.** "The page never scrolls" may be written in docs, PR text or mock-up captions only for what a test in `e2e/fit.spec.ts` pins. The mock-ups were made with `overflow: hidden` on the shell, so they could not prove it.

## Global Constraints

- No comments anywhere in code (`pnpm check:style` fails on any). No TypeScript `any`; use `unknown` and guards.
- `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`; `~/` is `src/`.
- New messages: none are needed. If one appears, add it to `src/i18n/en.ts` first, then `ar.ts`, same placeholders.
- Seams: S1 pure units in Vitest, S5 browser in Playwright. There is no jsdom component-test setup, so UI behaviour is tested in the browser.
- Browser tests: `pnpm build` first (Playwright serves `dist`), then `PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test <spec> --project=<project> --workers=4`. Never run two Playwright runs at once (port 4173).
- Playwright's headless Chromium launches with `--hide-scrollbars`. Anything about scrollbar width must run with `ignoreDefaultArgs: ["--hide-scrollbars"]` or it cannot fail.
- ARIA snapshots (`e2e/aria-snapshots.spec.ts-snapshots`) are machine-written: after an intended interface change run `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/aria-snapshots.spec.ts --update-snapshots` and read the diff before committing.
- Entry chunk limit 130 KB gzip (`pnpm check:size`). No new dependencies.
- Branch `claude/blissful-maxwell-ousv1q` (it carries PR #7, so this work lands in that PR unless the user says otherwise). One commit per task; every commit message ends with the two trailer lines `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01Co5QwofPvbdyeccGtMxdr9`.

## Review Focus

- The surah map, Stats, About and the Custom text form must still scroll normally and must not be put in fit mode. Pinned in Task 2.
- A passage that fits its window exactly must not become a "Scrollable text" tab stop (the earlier intermittent CI failure was a 1 px rounding case). Pinned in Task 2.
- At the largest and smallest font size the two-line minimum must never overlap the keyboard guide; the guide hides instead. Pinned in Task 3.
- Opening Settings on a phone must never leave the header collapsed under the dialog. Pinned in Task 4.
- A viewport too small for everything (a 640 x 360 window, which is a desktop at 200% zoom) must fall back to ordinary page scroll with every control reachable, never to clipped controls. Pinned in Task 2.

## Pinning "the page never scrolls"

`e2e/fit.spec.ts` is the only place the claim lives. Its helper `expectOneScreen` (in `e2e/helpers/fit.ts`) must not be satisfiable by hiding overflow:

- `document.documentElement.scrollHeight <= window.innerHeight` and `scrollWidth <= innerWidth`.
- The computed `overflow-y` of `html`, `body`, the shell root and `main` is neither `hidden` nor `clip`.
- Every region expected on screen (header, pager, passage window, keyboard guide, player or footer, tab bar) has `top >= 0` and `bottom <= innerHeight - reserve`.
- The centre of the player's play button is the topmost element at that point (`document.elementFromPoint`), so nothing covers it.

Matrix (table-driven; touch sizes use `test.use({ hasTouch: true, isMobile: true })`). Pages: passage 1 (short), passage 2:255 (long), Practice, Custom practice.

| Group | Sizes (CSS px) | Added in |
|---|---|---|
| Phones at rest | 375x667, 390x844, 412x915 | Task 2 |
| Tablet at rest | 820x1180 | Task 2 |
| Desktops | 1366x768, 1920x1080, 2560x1300 | Task 2 |
| Small laptops (guide hidden) | 1366x650, 1280x720 | Task 3 |
| Phones, keyboard up | 375x812 and 375x667 (keyboard 38%), 412x915 (30%), tablet 820x1180 (30%), landscape 812x375 (43%) | Task 4 |

---

## File Structure

| File | Responsibility |
|---|---|
| `src/typing/stage.ts` (new) | Pure stage arithmetic: guide fit, whole lines, window height, caret row and scroll position |
| `src/app/screen.ts` (new) | Pure device rules: phone, chrome level, Apple platform, keyboard reserve |
| `src/app/fitScreen.tsx` (new) | Context that lets a typing view switch fit mode on while mounted |
| `src/app/useChrome.ts` (new) | Hook combining soft keyboard state, phone rule and visible height |
| `src/typing/useStageFit.ts` (new) | Observes the stage and returns whether the guide shows and the window height |
| `src/app/Shell.tsx` | Fit-mode grid, in-flow tab bar, collapsed header, bottom reserve |
| `src/typing/TypingSurface.tsx` | Stage wrapper, `footer` slot, window sizing, hidden scrollbar, caret row, scroll-region rule |
| `src/keyboard/GuideKeyboard.tsx` | `GUIDE_HEIGHT_PX`, guide gap, 12 px under the keyboard, `hidden` prop |
| `src/recitation/RecitationPage.tsx`, `PassageFooter.tsx`, `src/practice/PracticePage.tsx`, `src/custom/CustomPage.tsx` | Switch fit mode on, pass `LiveStats` as `footer`, `min-h-0` wrappers, text-only chrome |
| `e2e/fit.spec.ts`, `e2e/helpers/fit.ts` (new), `e2e/helpers/platform.ts` | The pin tests and an `iphone` platform |
| `docs/TECHNICAL.md` | The layout rules and the wording rule |

---

### Task 1: Pure rules

**Files:**
- Create: `src/typing/stage.ts`, `src/typing/stage.test.ts`, `src/app/screen.ts`, `src/app/screen.test.ts`

**Interfaces:**
- Produces from `stage.ts`:
  - `MIN_WINDOW_LINES = 2`
  - `interface StageMetrics { readonly stage: number; readonly lineHeight: number; readonly padTop: number; readonly gapAboveGuide: number; readonly guide: number; readonly below: number }`
  - `fitsGuide(metrics: StageMetrics): boolean`
  - `wholeLines(available: number, lineHeight: number, padTop: number): number`
  - `windowHeight(lines: number, lineHeight: number, padTop: number): number`
  - `caretRow(lines: number): 0 | 1`
  - `caretScrollTop(caretTop: number, caretHeight: number, row: 0 | 1, lineHeight: number, padTop: number): number`
- Produces from `screen.ts`:
  - `PHONE_BELOW_PX = 600`, `TEXT_ONLY_BELOW_PX = 320`, `IOS_BAR_PX = 64`
  - `type Chrome = "full" | "collapsed" | "text-only"`
  - `isPhoneScreen(input: { coarse: boolean; screenWidth: number; screenHeight: number }): boolean`
  - `chromeFor(input: { phone: boolean; keyboardUp: boolean; visibleHeight: number }): Chrome`
  - `isApplePlatform(platform: string): boolean`
  - `keyboardReserve(input: { appleTouch: boolean; keyboardUp: boolean }): number`

- [ ] **Step 1: Write the failing tests** (values come from the approved mock-ups)

`stage.test.ts`:
- `fitsGuide`: with `lineHeight 80, padTop 12, gapAboveGuide 38, guide 236, below 32`, the need is 478. `stage 482` true, `478` true, `477` false, `364` false.
- `wholeLines(188, 80, 12)` is 2; `wholeLines(484, 80, 12)` is 5; `wholeLines(172, 80, 12)` is 2; `wholeLines(50, 80, 12)` is 1 (never below one).
- `windowHeight(2, 80, 12)` is 172; `windowHeight(5, 80, 12)` is 412.
- `caretRow(1)` and `caretRow(2)` are 0; `caretRow(3)` and `caretRow(5)` are 1.
- `caretScrollTop(412, 56, 1, 80, 12)` is 308; with row 0 it is 388.

`screen.test.ts`:
- `isPhoneScreen`: coarse 412x915 true; coarse 915x412 true (landscape); coarse 820x1180 false (tablet); coarse 599x900 true and 600x900 false (boundary); not coarse at 390x844 false.
- `chromeFor`: phone, keyboard up, 467 high is `"collapsed"`; phone, keyboard up, 213 is `"text-only"`; 319 is `"text-only"` and 320 is `"collapsed"`; phone without keyboard is `"full"`; not a phone with keyboard up at 213 is `"full"`.
- `isApplePlatform`: `"iPhone"`, `"iPad"`, `"MacIntel"` true; `"Win32"`, `"Linux armv8l"` false.
- `keyboardReserve({ appleTouch: true, keyboardUp: true })` is 64; any other combination is 0.

- [ ] **Step 2: Run them to verify they fail**

Run: `pnpm exec vitest run src/typing/stage.test.ts src/app/screen.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both files** with the signatures above. `fitsGuide` is `stage >= MIN_WINDOW_LINES * lineHeight + padTop + gapAboveGuide + guide + below`. `caretScrollTop` is `caretTop - padTop - row * lineHeight - (lineHeight - caretHeight) / 2`.

- [ ] **Step 4: Run them to verify they pass**

Run: `pnpm exec vitest run src/typing/stage.test.ts src/app/screen.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** `feat: pure stage and device rules for the one-screen layout`

---

### Task 2: One-screen shell, stage, hidden scrollbar

**Files:**
- Create: `src/app/fitScreen.tsx`, `e2e/helpers/fit.ts`, `e2e/fit.spec.ts`
- Modify: `src/app/App.tsx` (wrap `Shell` in `FitScreenProvider`), `src/app/Shell.tsx`, `src/typing/TypingSurface.tsx` (around lines 160-170, 225-250, 305-345), `src/recitation/RecitationPage.tsx` (`PassagePage`, `PassageLesson`), `src/practice/PracticePage.tsx`, `src/custom/CustomPage.tsx` (`Lesson`)
- Test: `e2e/fit.spec.ts`, `e2e/typing.spec.ts`

**Interfaces:**
- Produces: `FitScreenProvider({ children })`, `useFitScreen(): void` (a layout effect that marks the screen as fit while the caller is mounted), `useIsFitScreen(): boolean`.
- Produces: `TypingSurface` gains `readonly footer?: ReactNode`, rendered inside the stage after the keyboard guide. Recitation and Custom pass `<LiveStats session={session} />` through it instead of rendering it as a sibling.
- Produces: `expectOneScreen(page: Page, expected: { header: boolean; player: boolean; guide: boolean; tabBar?: boolean; reserve?: number }): Promise<void>` (`tabBar` defaults to true below 768 px wide, false otherwise; `reserve` defaults to 0) and `openSoftKeyboard(page: Page, share: number): Promise<void>` in `e2e/helpers/fit.ts`. `openSoftKeyboard` focuses the typing field, then shrinks the viewport height by `share` (what Chrome on Android does with `interactive-widget=resizes-content`).

- [ ] **Step 1: Write the failing tests**
  - `e2e/helpers/fit.ts`: `expectOneScreen` exactly as in "Pinning" above.
  - `e2e/fit.spec.ts`, rows "Phones at rest", "Tablet at rest", "Desktops" for the four pages (typing started so the caret is in the text; Custom practice is reached by seeding `customText` and pressing the page's start button). Test title: `fits one screen: <page> at <width>x<height>`.
  - `e2e/fit.spec.ts`: `long passages scroll inside their window, never the page` at 1366x768 on 2:255: the window has `scrollHeight > clientHeight`, `expectOneScreen` passes, and typing 160 characters keeps the caret rect inside the window rect.
  - `e2e/fit.spec.ts`: `pages that are not typing views still scroll` on `#/`, `#/stats`, `#/about` and the Custom text form at 375x667: `scrollHeight > innerHeight` is allowed and the last control can be scrolled to.
  - `e2e/fit.spec.ts`: `a window too small for everything falls back to page scroll with every control reachable` at 640x360 on passage 1: the play button `scrollIntoViewIfNeeded()` then is the topmost element at its centre.
  - `e2e/typing.spec.ts`: replace the test at line 477 (`a passage only a few pixels taller than its box...`) with `a passage that fits its window is not a scroll region` (passage 1 at 1366x768: zero `Scrollable text` groups) and `a passage that overflows its window is one focusable scroll region` (2:255 at 1366x768: exactly one group, `tabIndex` 0).
  - `e2e/fit.spec.ts`, in a `test.describe` with `test.use({ launchOptions: { executablePath: process.env.PW_CHROMIUM_PATH, ignoreDefaultArgs: ["--hide-scrollbars"] } })`: `the passage window has no scrollbar` on 2:255 at 1366x768: `offsetWidth - clientWidth` is 0, computed `scrollbarWidth` is `none`, and `page.mouse.wheel(0, 120)` over the window increases its `scrollTop`.

- [ ] **Step 2: Build and run to verify they fail**

Run: `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/fit.spec.ts e2e/typing.spec.ts -g "fits one screen|scroll|scrollbar" --project=chromium-desktop --workers=4`
Expected: the one-screen rows that overflow today (long passage, small tablet and phone sizes), the replaced scroll-region test and the scrollbar test FAIL (the page scrolls, the gutter is 15 px). `pages that are not typing views still scroll` and the 640x360 reachability test already pass: they are regression guards and must keep passing.

- [ ] **Step 3: Implement fit mode**
  - `Shell`: when `useIsFitScreen()` the root is `grid h-dvh grid-rows-[auto_auto_minmax(0,1fr)_auto]`, else today's classes. Tab bar: `static` (a grid row) in fit mode, `fixed` otherwise; `main` drops `pb-[calc(5rem+...)]` in fit mode on phones and gets `min-h-0`; its column gets `min-h-0`.
  - `PassagePage`, `PracticePage` and the Custom `Lesson` call `useFitScreen()` and make their wrapper `flex min-h-0 flex-1 flex-col gap-3`.
  - `TypingSurface`: render `<div data-stage className="flex min-h-0 flex-1 flex-col justify-center gap-3">` around the section, the guide and `footer`. Window classes: remove `max-h-[45dvh] md:max-h-[60dvh]`, set `min-h-[calc(4em+0.75rem)]`, add `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`. The `scrollable` rule at lines 229-231 becomes `container.scrollHeight - container.clientHeight > OVERFLOW_TOLERANCE` (the `maxHeight` probe is deleted).

- [ ] **Step 4: Run the same command to verify it passes**, then `pnpm check && pnpm check:style && pnpm typecheck`.
Expected: PASS, no style or type errors. If an ARIA snapshot differs, update it and read the diff.

- [ ] **Step 5: Commit** `feat: typing views fit one screen with a scrollbar-free passage window`

---

### Task 3: Keyboard spacing, hide-when-no-room, whole lines

**Files:**
- Create: `src/typing/useStageFit.ts`
- Modify: `src/keyboard/GuideKeyboard.tsx` (line 134 and root classes), `src/typing/TypingSurface.tsx` (the `place` function around lines 221-250)
- Test: `e2e/fit.spec.ts`, `e2e/guide.spec.ts`

**Interfaces:**
- Consumes: everything from `stage.ts`.
- Produces: `guideHeight(fingerGuide: boolean): number` exported from `GuideKeyboard.tsx`: 5 rows x `KEY_PX` (200), plus 36 when the finger hint is on (its 24 px row and the 12 px gap above it), so 236 by default. It is the one source of truth for the guide's height, so the guide can be measured while it is hidden. `GuideKeyboard` gains `readonly hidden?: boolean`.
- Produces: `useStageFit(stage: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, guide: number): { readonly showGuide: boolean; readonly windowHeight: number | null }`. It observes the stage with a `ResizeObserver`, reads the line height and top padding of `text` from computed style, takes the guide gap from the guide's `margin-top` and `below` as the `footer` slot's height plus the stage row gap (32 with the live stats row), and uses `fitsGuide`, `wholeLines` and `windowHeight`. `windowHeight` is `null` while the passage fits (natural height).

- [ ] **Step 1: Write the failing tests**
  - `e2e/fit.spec.ts`: add rows "Small laptops (guide hidden)". Test `the guide hides rather than squeeze the text` at 1366x650 and 1280x720: `expectOneScreen` with `guide: false`, and at 1366x768, 1920x1080 and 2560x1300 with `guide: true`.
  - `e2e/guide.spec.ts`: `the keyboard sits clear of the text` at 1366x768 and 1920x1080: `guide.top - window.bottom` is within 1 px of 38 and 54, and is at least 32 at 1366x768. `the finger hint sits 12 px under the keyboard`: with finger guide on, `hint.top - lastKeyRow.bottom` is within 1 px of 12.
  - `e2e/fit.spec.ts`: `a long passage window shows whole lines only` (2:255 at 1366x768 and 1920x1080): `(window.clientHeight - paddingTop) / lineHeight` is an integer after typing 160 characters, and the caret line's top is on row 1 (3+ lines) or row 0 (2 lines) within 1 px.
  - `e2e/fit.spec.ts`: `the guide never overlaps the text at the largest and smallest font size` at 1366x768 with `fontSize` seeded to the min and max from `src/settings/fonts.ts`: the guide is hidden or `guide.top >= window.bottom + 32`.

- [ ] **Step 2: Build and run to verify they fail**

Run: `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/fit.spec.ts e2e/guide.spec.ts --project=chromium-desktop --workers=4`
Expected: FAIL on the new rows and spacing tests.

- [ ] **Step 3: Implement**
  - Guide gap on the guide root: `mt-[clamp(1.25rem,calc(5dvh-0.75rem),2.75rem)]` (stage `gap-3` supplies the other 12 px). Caption gets `mt-3`.
  - `TypingSurface` uses `useStageFit(..., guideHeight(settings.fingerGuide))`: hides the guide (`hidden` prop) when `showGuide` is false, and sets the window's inline `height` to `windowHeight` when it is not `null`. At 1366x768 the default guide fits with 4 px to spare (478 needed of 482); the test pins it, so re-derive the numbers if the spacing ever changes.
  - `place()` computes the caret scroll position with `caretScrollTop` and `caretRow(wholeLines(...))` when the window is clipped; the old centring formula goes away.

- [ ] **Step 4: Run the same command to verify it passes**, plus Task 2's tests (`e2e/fit.spec.ts` whole file) and `pnpm check && pnpm check:style && pnpm typecheck`.
Expected: PASS.

- [ ] **Step 5: Commit** `feat: keep the keyboard clear of the text and show whole lines only`

---

### Task 4: Phones with the soft keyboard

**Files:**
- Create: `src/app/useChrome.ts`
- Modify: `src/app/Shell.tsx`, `src/recitation/RecitationPage.tsx`, `src/recitation/PassageFooter.tsx` (hide support), `e2e/helpers/platform.ts` (add `iphone: { platform: "iPhone", hint: "iOS" }`)
- Test: `e2e/fit.spec.ts`

**Interfaces:**
- Consumes: `isPhoneScreen`, `chromeFor`, `keyboardReserve`, `isApplePlatform` from `screen.ts`; `useSoftKeyboard` from `softKeyboard.ts`; `platformOf` from `~/keyboard/platform.ts`.
- Produces: `useChrome(): { readonly chrome: Chrome; readonly reserve: number }`. It reads `matchMedia("(pointer: coarse)")`, `screen.width` and `screen.height`, `window.visualViewport?.height ?? innerHeight`, and re-renders on viewport resize.

- [ ] **Step 1: Write the failing tests**
  - `e2e/fit.spec.ts`, rows "Phones, keyboard up": `fits one screen with the keyboard up: <page> at <size>` using `openSoftKeyboard` and `expectOneScreen({ header: false, tabBar: false, ... })`. For 375x812 add `emulatePlatform(page, "iphone")` and `reserve: 64`; the bottom of the player is at most 64 px above the viewport bottom.
  - `tablets keep the header with the keyboard up` (820x1180, 30%): header visible, `expectOneScreen({ header: true })`.
  - `landscape phones show only the text` (812x375, 43%): pager, player and live stats are hidden, the window holds at least one line, `expectOneScreen({ header: false, player: false })`.
  - `closing the keyboard brings the header back`: after `page.setViewportSize` back to full height and blurring, the header is visible again.
  - `Settings opened on a phone is never hidden under a collapsed header`: at 375x667 tap Settings, the dialog is visible and the header is not collapsed while it is open.

- [ ] **Step 2: Build and run to verify they fail**

Run: `pnpm build && PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm exec playwright test e2e/fit.spec.ts -g "keyboard up|tablets keep|landscape|Settings opened|closing the keyboard" --project=chromium-mobile --workers=4`
Expected: FAIL (header still shown, no reserve).

- [ ] **Step 3: Implement**
  - `Shell` hides the header row with the `hidden` attribute when `chrome !== "full"` (the safe-area top padding stays on the `header` element) and applies `paddingBottom: reserve` to `main` while the keyboard is up.
  - `PassagePage` hides the pager, and `PassageFooter` plus `LiveStats` hide, when `chrome === "text-only"`. The window minimum becomes one line in that mode.

- [ ] **Step 4: Run the same command to verify it passes**, then the whole `e2e/fit.spec.ts` on both projects and `pnpm check && pnpm check:style && pnpm typecheck`.
Expected: PASS.

- [ ] **Step 5: Commit** `feat: collapse the header while a phone keyboard is up`

---

### Task 5: Docs, full verification, push

**Files:**
- Modify: `docs/TECHNICAL.md` (new "One-screen layout" section: the eight settled rules, the `useFitScreen` mechanism, why the shell is not `overflow-hidden`, the wording rule, the unverified-on-device note below), `README.md` only if it mentions the old layout.

- [ ] **Step 1: Write the docs.** Name the unverified parts honestly: the 64 px Apple bar reserve is calibrated from one iPhone 12 mini screenshot, Firefox and WebKit have not run `e2e/fit.spec.ts`, and `interactive-widget=resizes-content` is assumed on iOS because the screenshot shows the page shrinking.
- [ ] **Step 2: Run the whole gate**

Run: `pnpm verify`
Expected: all green (check, check:style, build, check:size, typecheck, vitest, Playwright on both projects). Fix anything red before continuing.

- [ ] **Step 3: Commit and push**

```bash
git add docs/TECHNICAL.md README.md
git commit -m "docs: describe the one-screen layout and what pins it"
git push -u origin claude/blissful-maxwell-ousv1q
```

- [ ] **Step 4: Watch CI** for the pushed head. If `build` is red, read the failing job log and fix; never skip or loosen a fit test to get green.
