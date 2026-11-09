# Mafatih v2 — Ground-Up Rebuild Plan

Mafatih is rebuilt coherently around one principle the first version learned too late:
**the Qur'an is sacred text and is never used as raw drill material.** The Qur'an appears
only in Recitation mode (the default), typed as real, ordered, meaningful ayaht. Practice
mode drills on a separate, secular corpus. Progression is the spine that connects both.

## Non-negotiables

- **The `tdd` skill must be used for all implementation work.** Red → green loop, one
  vertical slice per cycle, tests at pre-agreed seams only, expected values from
  independent sources of truth, never tautological or implementation-coupled tests.
  Refactoring happens at review time, not inside the loop.
- **The `laws-of-simplicity` skill must be used at every stage** — before each task
  (framing), during (REDUCE/ORGANIZE/TIME checkpoints), and at review (simplicity_delta
  scoring, decision matrix). Complexity for marginal gain is cut.
- **Destructive actions always ask first.** Reset progress, delete-level actions and
  similar are never one click and done: each opens a confirmation dialog that names
  exactly what will be lost, cannot be triggered by accident, and follows mufradat's
  UX language (ask first, say what happens, disable with a reason).
- **UI/UX inspiration: [mufradat](https://github.com/scuba-plaza/mufradat)** — states
  shown by borders, spinners that replace icons so nothing moves, disabled controls
  that name their reason, consistent icon capsules.
- **Qur'an-respect rules, enforced by build-time tests, not convention:**
  1. Qur'anic text is rendered only in Recitation mode, in canonical order, as complete
     ayaht within their surah context.
  2. Qur'anic text is never split, shuffled, scrambled, truncated mid-ayah, or mixed
     into drills.
  3. Practice mode draws exclusively from a secular corpus stored separately from the
     Qur'an corpus.
  4. A build-time guard asserts practice content is presented as neutral word drills
     and never reassembles Qur'anic passages.

## Product shape

- **Recitation (default mode).** Type the Qur'an surah by surah, ayah by ayah, in order.
- **Practice mode.** Drills from a secular modern-standard-Arabic corpus. Progression
  filters drill content to unlocked letters/harakat and weights toward the focus letter.
- **Progression.** Letters first (order tuned to Arabic 101), then harakat tiers
  (`none → core → full`), recent-accuracy windows with ≥95% plus minimum-attempts-per-mark
  gates. One progression state drives both modes.
- **Stats, Settings, Custom text, import/export, mobile** are retained (near-parity).

## Architecture

Same repo, fresh `src/`. Proven v1 concepts (whitelist normalisation derived from the
keyboard table, dual-layer clip-path rendering, 3-second pause-cap latency, corpus build
guarantees) are re-derived test-first rather than copy-pasted.

```
src/
  engine/        pure, DOM-free, fully unit-tested
    typing/      keystroke reducer, accuracy, latency, pause cap
    progression/ unlock ladder, recent-accuracy windows, tier gates
    corpus/      loaders + invariants for quran and practice corpora
  text/          normalisation whitelist, typeable set, drill composer
  ui/            React components (thin; logic lives in engine)
  storage/       versioned local-storage schema + migrations
scripts/
  build-corpus.ts      Qur'an pipeline (Tanzil simple/imlaei)
  build-practice.ts    secular corpus pipeline (license-checked)
```

Stack: React + Vite + Tailwind + Biome + `node:test` + Cypress, no router lib.

## Tasks

Each task is a vertical slice ending in a working increment. **After every task the
review protocol runs before the next task begins.**

1. **Foundations & skeleton.** Fresh app shell, tooling, CI, this document.
2. **Qur'an corpus pipeline.** Normaliser (TDD against worked examples), build fails
   unless 6,236 ayaht, full surah metadata, zero untypeable characters.
3. **Practice corpus pipeline.** Curated secular MSA word list, filtered to the typeable
   set, tagged with letter sets, graded by hardest letter, license recorded.
4. **Core typing engine.** Pure reducer: cursor, accuracy, latency with 3s pause cap,
   cursor never advances past an error.
5. **Progression engine.** Letter ladder, harakat tiers, recent-accuracy windows, tier
   gates; drives practice selection and recitation hints.
6. **Typing surface & rendering.** Dual-layer clipped rendering (cursive-safe),
   space-only line breaks, ARIA from the start.
7. **Practice mode UI.** Drill composer keyed to unlocked letters, session flow.
8. **Recitation mode (default).** Surah map, ayah flow, resume, ✓/★, audio pause
   semantics, Qur'an-respect guard tests.
9. **On-screen keyboard & layout guard.** Arabic (101), finger colours, next-key hints.
10. **Stats & settings.** Per-character stats, settings, versioned storage,
    import/export.
11. **End-to-end hardening.** Mobile, error boundary, CSP, privacy, SEO, Cypress suite,
    accessibility audit, docs, release.

## Review protocol (after every task)

A **review sub-agent** runs against all changes the task made; if the environment cannot
spawn sub-agents, the main agent reviews itself in an explicitly adversarial frame.
The reviewer must:

- **Be adversarial**: hunt for broken invariants, untested branches, dead code, seam
  violations, spec/implementation drift, and any violation of the Qur'an-respect rules.
- **Focus on UI/UX coherence and ARIA**: correct roles and accessible names, logical
  focus order and visible focus, `aria-live` usage that does not flood screen readers,
  dialog semantics and escape handling, RTL correctness, contrast, coherent visual
  language, honest empty/loading/error states.
- **Apply the laws-of-simplicity checklist** and assign a `simplicity_delta`; findings
  with delta ≤ -2 and no metric win are rejected outright.
- **Hand every finding back to the main agent**, ranked. The main agent fixes **all
  findings, including minor ones**, before starting the next task.
