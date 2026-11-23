# Spike: mounting the real lesson surface read-only (Task 3)

Reading `TypingSurface` against the four acceptance items of the plan:

| Item | What the code did | Change |
|---|---|---|
| 1. Independent highlights | `paint` wrote, and the unmount effect deleted, the global names in `CSS.highlights` (`mafatih-done`, ...). A second surface would overwrite or delete the lesson's highlights. | `highlightName(name, scope)` in `paint.ts`; the surface paints and cleans up under its own scope. Every `::highlight()` rule in `globals.css` now lists the lesson name and the `-preview` name in one selector list. `src/styles/highlights.test.ts` fails if a rule does not. |
| 2. Read-only | Focus, click/mousedown handlers, the document `keydown` handler (Enter activates), the hidden input, live regions and the miss animation. | One optional prop, `preview: { lines }`. With it the wiring is not attached or rendered. The text, caret, highlight and guide code is the same code. |
| 3. No page fitting | `useStageFit` and `useReportFitMinHeight` read page space and report a minimum height to the shell. | With `preview` the report is a no-op, the guide's fit decision is ignored and the window height is `calc(lines * 2em + 0.75rem)` (the surface's own line height of 2 and its top padding). |
| 4. One code path | n/a | The prop switches wiring only. Class names and markup of the text and keyboard do not depend on it, except three test hooks (`data-typing-surface`, `data-lesson-text`, `data-stage`) that become `data-preview-surface` / `data-preview-text` / none, so specs that look for the lesson do not find the preview. |

Characterization: the lesson surface (text and keyboard) was captured before and after at 3 fonts x 3 sizes x 2 viewports (18 images); all 18 are byte-identical. `typing`, `ligatures`, `ligature-census`, `perf`, `fit`, `scrollbar` and `reduced-motion` specs pass on both Chromium projects.
