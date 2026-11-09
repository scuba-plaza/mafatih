# Mafatih v2 — technical notes

How the rebuilt Mafatih works. The plan and its rules are in [REBUILD_PLAN.md](REBUILD_PLAN.md).

## The Qur'an is never drill material

The v1 practice mode scrambled Qur'anic words, robbing sacred ayaht of their meaning. v2 enforces
the opposite at build time:

- `scripts/build-corpus.ts` produces `generated/corpus.json` (6,236 ayat, in order, complete) and
  fails the build on any count, order or metadata mismatch.
- `scripts/build-practice.ts` produces `generated/practice.json` from
  `data/practice-words.txt` — a fully vocalized, project-authored secular word list — and fails
  unless every word is typeable on Arabic (101), unique, **carries at least one haraka** (so the
  "full vocalization" tier drills real vocalization, not the lower tiers' text), and no three-word
  run of any ayah appears verbatim in the practice corpus.
- The app renders Qur'anic text only in Recitation mode, ayah by ayah in canonical order.

## Typeability is a whitelist derived from the keyboard

`src/engine/layout.ts` holds the Arabic (101) table; the typeable set is derived from it, so a
lesson can never contain a character the keyboard cannot type. Normalisation (`normalize.ts`) is
NFC + ligature expansion + whitelist filtering; the only Qur'anic casualty is the dagger alef
(U+0670), whose removal yields the standard modern spelling (`هٰذا` → `هذا`). Verified by tests
against worked examples.

## The typing engine

`typing.ts` is a pure reducer. The cursor never advances past an error; a wrong key is held until
backspaced. A gap longer than 3 s is a pause, not a slow keystroke: the key still counts for
accuracy but not as a latency sample.

## Progression

`progression.ts`: 36 letters in an Arabic (101)-tuned order, one focus letter at a time. A letter
unlocks at ≥95% recent accuracy over ≥20 attempts (recent = first-20 mean, then a 40-attempt moving
window). Harakat tiers advance only after all 36 letters and after each mark of a tier has 8
attempts at ≥95%. The same progression drives Practice (which letters and which tier appear) and
Recitation (which tier the ayah is displayed in).

## Rendering

`TypingLine` renders each line twice, stacked and identical; the top layer is clipped at the cursor
with `clip-path: inset()`. Both layers are single uninterrupted text runs, so cursive joining and
combining marks are perfect by construction. Lines break at spaces only.

## Verification

- `pnpm test` — corpus + practice builds, unit tests (`node:test`) over the engine, and a
  server-render smoke of the whole app.
- `pnpm check` — Biome lint and format (a11y rules on).
- `pnpm build` — both corpora, typecheck, production build.
- `pnpm exec cypress run --e2e` — end-to-end smoke specs (needs a display; on Nix use
  `pnpm cypress:nix`).
