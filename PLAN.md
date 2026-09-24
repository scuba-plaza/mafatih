# Plan — letter progression fix and Story Mode

## 1. Letters never unlock

### Root cause

`isMastered` (`src/engine/stats/keystats.ts`) gates every unlock on **lifetime** accuracy
`hits / (hits + misses)` ≥ 95%. Early mistakes never age out, so a learner who was sloppy for their
first hour has to type hundreds of lessons flawlessly before the ratio crawls back over the line.
Speed is an EWMA and adapts; accuracy did not. The none → core → full tier gate summed lifetime
hits and misses in the same way.

Simulated through the real lesson → session → stats → unlock pipeline:

| Learner | Result |
|---|---|
| 400 ms/key, 2% errors | all 36 letters in ~370 lessons |
| 300 ms/key, 6% errors | still 6 letters after 1,500 lessons (7,800 attempts on the focus letter at 94%) |
| 12% errors for 150 lessons, then 3.5% | ~700 lessons before the first unlock |

Every progression e2e test seeded pre-mastered stats (`masteredStats`), so no test ever typed its way
to an unlock. Typing with no delay also gives every keystroke the same timestamp, so `meanMs` stays
0 and `isMastered` (which requires `meanMs > 0`) can never pass — another reason the seeding hid it.

### Fix

- `KeyStat` gains `recentAccuracy`, updated on every hit and miss: the exact mean for a character's
  first 20 attempts, then an EWMA with α = 0.05 (roughly the last 40 attempts). `hits`/`misses` stay
  for the Stats page. α = 0.1 was tried first; it let a 20%-error typist unlock letters on lucky
  streaks, and starting new characters at an assumed 100% let the tier gate pass on too little data.
- `isMastered` gates on `recentAccuracy`; `shouldAdvanceTier` gates on the attempt-weighted recent
  accuracy of the active characters.
- `parseProfile` backfills `recentAccuracy` from the old lifetime ratio. `PROFILE_VERSION` is **not**
  bumped, because a version mismatch wipes the profile. A stuck profile recovers after ~20 clean
  attempts on the focus letter.
- The header shows the focus letter with its recent accuracy and latency (`data-cy=focus-letter`), and
  the Stats bars show recent accuracy.

Simulated again with the fix: the 6%-error typist reaches ~26 letters in 300 lessons, the 2% typist
~35, a 20% typist stays at 6–7, and a typist recovering from a sloppy start climbs right away.

### Tests

- Unit: seeded simulated learners — clean typist climbs; sloppy-then-recovering typist unlocks soon
  after recovering (fails on the old code); persistently sloppy typist never unlocks.
- Cypress helpers `typeTargetWithMistakes` and `completeLessons`, always with a real inter-key delay.
- E2E with no seeded stats: fresh profile types its way 6 → 7 → 8 and the new focus letter shows up
  in the lesson; a profile stuck at 90% lifetime accuracy unlocks within a bounded number of clean
  lessons; progress survives a reload mid-climb.

## 2. Recitation as Story Mode

Adaptive practice is the open-world sandbox, recitation is the story, and each surah is a level.

### Bug

`buildLesson` never passed `fromAyah`, so every recite passage started at ayah 1 and finishing one
re-served the same ayat.

### Decisions

- **Surah order**: mushaf order 1 → 114 by default, with Juz ʿAmma first (114 → 78, then 1 → 77)
  selectable in the recitation settings.
- **Completion**: a surah is complete once every ayah has been typed; a ★ marks a best accuracy of
  95% or more.
- **Locking**: none — every surah is open.
- **Resetting**: "Reset progress" keeps the story; a separate "Reset story" clears it.

### Persistent state

`profile.story`:

- `position: { surah, ayah }` — where the next passage starts.
- `surahs: Record<n, { furthestAyah, completions, bestCpm, bestAccuracy, completedAt }>`.

Pure logic in `src/engine/story/story.ts` (`recordPassage`, `surahProgress`, `nextSurah`, …) with unit
tests. `settings.surah` is migrated into `story.position`. Recite lessons keep counting toward letter
statistics.

### Navigation

- Recitation settings: surah picker plus a "Start at ayah" picker, and the surah order option.
- Under the passage: previous / next passage buttons, "Al-Baqarah · 17–20 / 286", a clickable surah
  progress bar, and Alt+← / Alt+→ shortcuts.
- `#/story` route: a map of 114 surah tiles with progress rings, ✓ for complete, ★ for ≥95%.
  Clicking a tile continues from the furthest ayah in that surah.

### Celebration

Finishing the last passage of a surah opens an overlay with the surah name in Arabic, ayat typed, time
and accuracy, a CSS-only burst (disabled under `prefers-reduced-motion`), and "Next surah" /
"Type it again". Typing is suspended while it is open. The surah progress bar animates forward after
every passage.

### Tests

- Unit: `generateRecitePassage` with `fromAyah`, the story transitions, profile migration.
- E2E (`story.cy.ts`): passage advance 1–4 → 5–8, persistence across reload, ayah picker and
  previous/next, surah 112 completion → celebration → "Next surah" goes to 113, the map shows 112 as
  complete, Juz ʿAmma order, "Reset story".

## Order of work

1. Letter fix, unit tests, e2e.
2. `fromAyah` bug and story state.
3. Navigation.
4. Surah map.
5. Celebration.

`pnpm check`, `pnpm typecheck`, `pnpm test` and `pnpm cypress:run` after each step.
