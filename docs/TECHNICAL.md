# Mafatih — technical notes

How Mafatih works under the hood. For what it is and how to use it, see the [README](../README.md).

Arabic typing has three problems Latin typing does not, and all three had to be solved before a
single lesson could render.

## 1. Is the text even typeable?

Qur'anic orthography carries marks no standard keyboard can produce. The whole Qur'an, measured:

| | |
|---|---|
| Distinct codepoints in the entire text | **46** |
| Untypeable on the standard Arabic (101) layout | **1** (`U+0670`, dagger alef — 3,330 occurrences) |
| Untypeable after normalisation | **0** |
| Distinct fully-diacritised word forms | 18,198 |

The single rule is **drop `U+0670`**. Verified against all 411 words containing it, dropping it
yields exactly the standard modern spelling every time (`هٰذا`→`هذا`, `علىٰ`→`على`, `ذٰلك`→`ذلك`).

Edition choice does the rest of the work. Tanzil ships several; the **Simple (imlaei)** text has 46
distinct codepoints where the Uthmani text has 62. The 17 extras are precisely the untypeable
recitation apparatus — wasla `ٱ`, maddah `ٓ`, the silent-letter zero `۟`, small waw/yeh, tatweel,
small high/low meem. Simple contains none of them, nor waqf/sajda/juz markers, nor punctuation.

Normalisation is nonetheless a **whitelist**, not a blacklist: it keeps the 90 typeable codepoints —
36 letters, 8 harakat, the space, and the 45 punctuation marks, digits and symbols
(`. ، : ؛ ؟ ! " ( ) [ ] { } 0–9 …`) the Arabic (101) keyboard produces — and drops everything else.
The set is derived from the keyboard table itself, so a lesson can never contain a character the
keyboard cannot type; tatweel is the one deliberate exclusion, being an elongation glyph with no
phonetic content. It cannot miss a mark nobody thought of, and it makes the pipeline
edition-agnostic — point it at Uthmani text, or at hadith or plain MSA prose, and it just works.

`pnpm build:corpus` fails the build unless the output contains exactly 6,236 ayat, the surah
metadata accounts for every one of them, and zero characters fall outside the layout's typeable set.
*The app can never show you a character you cannot type* is a build-time guarantee, not a hope.

The artifact stores ayat as **text only**. Their surah and ayah numbers are derived from the surah
metadata at load, since the ayat are in order and each surah declares its count; storing them on
every record would add 49 kB of raw JSON that says nothing the file does not already know.

## 2. Harakat are 40.5% of all characters — and every one needs Shift

**42.8% of keystrokes are shift-layer.** That is unlearnable head-on, so diacritics ramp in tiers:

| Tier | Contents |
|---|---|
| `none` | letters only — ordinary undiacritised Arabic, what you actually type day to day |
| `core` | `َ ُ ِ ْ ّ` |
| `full` | `+ ً ٌ ٍ` |

Tiers advance automatically at ≥95% accuracy and can be overridden. Statistics are kept **per
character, not per keycap**, so `َ` carries its own speed and accuracy independently of `ض` even
though they share a key. Diacritics are first-class citizens of the unlock ladder.

The accuracy that gates both the tiers and the next letter is **recent**, not lifetime: the exact
mean over a character's first twenty attempts, then a moving average over roughly the last forty.
A lifetime ratio would never let early mistakes age out — a learner with a sloppy first hour, or a
steady 6% error rate, would stay at six letters no matter how long they practised. Simulated through
the real lesson, session and unlock code, that learner climbs past twenty-five letters in three
hundred lessons, while one at 20% errors still has to improve first. The header shows the
focus letter with its recent accuracy and latency, so it is always clear what the next unlock needs.

**A pause is not a slow keystroke.** Any gap longer than three seconds is treated as a break: the
keystroke that ends it still counts for accuracy, but not as a latency sample, and the break itself
is left out of the lesson's elapsed time and speed. Three seconds is long enough for a beginner
hunting for an unfamiliar key — that slowness is real and should count — and far too long to be
typing. Without the cap, one ten-minute interruption would have pushed a letter's average latency
into the minutes and blocked its unlock for dozens of keystrokes.

## 3. Arabic is cursive, so per-character highlighting breaks letter joining

Wrapping each character in its own `<span>` — the obvious approach — risks breaking cursive joining
and puts combining marks in degenerate one-mark spans.

The way out follows from keybr's own rule. **Because the cursor can never advance past an error, the
line is always exactly `[typed prefix][cursor][untyped suffix]`** — wrong characters never sit behind
the cursor. So per-character colouring is unnecessary.

Each line renders **twice, stacked and identical**; the top layer is clipped at the cursor with
`clip-path: inset()`. Both layers are single uninterrupted text runs, so shaping is perfect by
construction and the two are glyph-identical. Only pixels are clipped, never a text run. Line breaks
are chosen by the app at spaces only, so no cursive join is ever split.

## Setup

Mafatih reads the characters your OS produces and is built around **Arabic (101)**, so that layout
must be active. On Windows, add **Arabic (101)** under Settings → Time & language → Language. On
Linux:

```sh
setxkbmap ara                # Arabic — the same keys as Arabic (101)
```

If the app sees Latin keystrokes it says so rather than silently scoring them as errors.

```sh
pnpm install
pnpm build:corpus
pnpm dev
```

## The keyboard

Mafatih supports exactly one layout, **Arabic (101)**: the standard Windows Arabic keyboard
(`KBDA1`), transcribed from Microsoft's own layout table and checked key by key in the unit tests.
It is the layout most Arabic typists already have, and supporting one layout means the letter order
can be tuned to it (see *Adaptive lessons* below). Linux's `ara` layout is a port of it with the same
keys for everything a lesson can contain — it differs only in typing ASCII `` ` `` and `'` where
Windows has `‘` and `’`.

| | Arabic (101) |
|---|---|
| home row | `ش س ي ب ل ا ت ن م ك ط` |
| harakat | on the shift layer of `Q W E R` (`َ ً ُ ٌ`), `A S` (`ِ ٍ`), `X` (`ْ`) and the backtick (`ّ`) |
| hamza carriers | `أ` Shift+`H`, `إ` Shift+`Y`, `آ` Shift+`N`; `ؤ ئ ء` on `C Z X` |
| lam-alef | `ﻻ` on `B`, with `ﻷ ﻹ ﻵ` on Shift+`G T B` |
| far corners | `ذ` on the backtick, `د` and `ج` on the bracket keys |

**The four lam-alef ligature keys are encouraged.** Arabic (101) types `لا`, `لأ`, `لإ` and `لآ`
with a single key (`B`, Shift+`G`, Shift+`T`, Shift+`B`), so wherever a lam is followed directly by
an alef, the on-screen keyboard highlights the ligature key rather than the lam. Typing the two
letters separately is still accepted. A ligature is scored as a key like any other: one keystroke,
one latency sample, under its own entry in the per-character statistics, rather than being split
across its letters, which would hand the alef a zero-millisecond sample. A wrong key where a
ligature is due counts as a miss on the ligature. Windows sends a ligature key as its two letters in
one event, where xkb sends a single presentation form; the session accepts both.

The keyboard **docks to the bottom of the window**, a margin clear of the edge, and floats over the
lesson on a faintly tinted, blurred panel rather than sitting under it. A long passage scrolls
past a keyboard that stays where your eyes already are: whenever the cursor moves onto a new line,
or a new lesson starts, that line is scrolled to the middle of the space above the keyboard —
smoothly, or instantly under `prefers-reduced-motion`. It can also be hidden entirely from
settings once you no longer need it, and hiding it removes the dock with it.

## Fonts

Three Arabic faces ship self-hosted, selectable in settings, **defaulting to Noto Naskh Arabic** —
its harakat are the most evenly spaced and the roomiest of the three, which is what a learner reading
a vocalised line at speed actually needs.

All three are Qur'anic faces that ligate `U+06DD`, so the end-of-ayah rosette encloses its number
rather than sitting beside it. That is why a general-purpose sans has no place in this list.

| Face | Character |
|---|---|
| Noto Naskh Arabic | even, roomy harakat — the default |
| Scheherazade New | drawn by SIL for full vocalisation |
| Amiri | classical naskh |

Only the Arabic subsets are bundled (13–109 KB each) and a face is fetched only when it is actually
applied, so picking one costs a single file. Settings shows a vocalised sample so the faces can be
compared on the thing that matters here: where the harakat sit.

**Font size** is a setting too, nine steps from 28 px to 72 px. Because the app picks its own line
breaks rather than letting the browser wrap, the chunker has to know how wide a line really is, and
a character count is a poor guess at that: a haraka is a combining mark that adds no advance at all,
and no two letters are the same width. So it measures instead — each candidate line on a canvas, in
the face and the size actually rendered, plus the ayah marks drawn into it — and takes words until
the next one would pass the measured column. A line therefore comes out the same width at every
diacritic tier, in every face, and at every window width, including the narrow ones where the size
is itself capped at `8vw`. A resize re-measures and re-chunks. Changing the face or the size does
not restart the lesson — only the page, diacritic tier and passage do, since only those change the text.

## Interface

The page you are on is the mode you are in. There is no mode setting: the header's **Practice**,
**Recitation** and **Custom** each open their own kind of lesson, and the highlighted one is always
the one on screen. The practice page is deliberately almost empty: a lesson, a metrics line, and
the on-screen keyboard.

A lesson ends the instant its last character lands, and the next one is already on screen — nothing
to click, nothing to acknowledge. The run that just ended survives as the `last` readout beside the
live metrics, so the numbers for it are still there while you type on.

| | |
|---|---|
| Practice | `#/` — the adaptive lesson; `6/36 · none` in the header is the whole progress display |
| Recitation | `#/recitation` — the surah map, see *Recitation* below |
| A recitation level | `#/recitation/36/21` — Ya-Sin from ayah 21; `#/recitation/36` resumes it where it was left |
| Custom | `#/custom` — your own text, edited in place with **Edit text** |
| Stats | `#/stats` — tiles, the per-character bars, and the last ten lessons |
| Privacy | `#/privacy` — the privacy policy, linked from the footer on every page |
| Settings | a modal `<dialog>`, closed on Escape, on a backdrop click or on **Done** |
| Recitation settings | a second `<dialog>` reached from Settings — surah, starting ayah, order, length, reciter, cache |

Picking a surah, on the map or in the recitation settings, opens its level and stays on the
recitation page. The address follows the passage as you type on, replacing itself rather than
piling up history, so a reload reopens the passage on screen, a level can be bookmarked or shared,
and Back leaves the level for the surah map.

Settings holds what applies to every lesson: diacritics, font, keyboard. Everything that only means
something in recitation lives one step in, behind **Recitation**, which keeps the first dialog
short. Both are the same `Modal` shell, and only one is ever
open — the shell ignores the `close` event the browser fires when a dialog is closed
programmatically, so handing over from one to the other does not read as a dismissal.

On a recitation level a player appears under the metrics: a player for the passage on screen,
recited by **Abdul Basit ʿAbd us-Samad**. See *Recitation* below.

Keystrokes are only scored on a lesson page with the dialog closed, so typing at the stats page
or while changing a setting cannot pollute your per-character statistics.

Everything in settings is written to `localStorage` on change, under the same
`mafatih.profile` key as progress and history, and is read back through a whitelist — an unknown
font, an out-of-range surah or a hand-edited font size falls back to its default rather than
reaching the app. **Reset progress** clears progress, statistics and history but keeps the settings,
since they are not progress, and keeps the recitation progress, which has its own **Reset recitation
progress** on the surah map.

## Adaptive lessons from real words

Letters unlock in an order tuned to Arabic (101): each letter's frequency in the corpus, weighted
by how far its key is from the home position. Every key has a reach cost — 0 for the eight home
keys, ½ for the inner stretches to `ل` and `ا`, more for the rows above and below, the pinky
corners and the number row, and 1 more for Shift — and a letter scores `frequency × e^(−reach)`:

```
ن م ا ي ل ب ك ت و س ه ر ع ق ش أ ف ح خ ة ص ء ى ز ث د ط ج إ ض غ ئ ذ ؤ ظ آ
```

So the first six letters all sit on the home row or right beside it, and a frequent letter on a far
key waits: `ذ`, on the backtick, went from 19th under pure frequency to 33rd, while `ة`, under the
right index finger, moved up from 24th to 20th and the home-row `ش` from 25th to 15th. The order is
computed by the corpus build from the keyboard table, so it cannot drift from the keys.

keybr must invent pseudo-words for a restricted alphabet. Mafatih never does — even six unlocked
letters yield 186 real Qur'anic word forms, ten yield 1,237, fifteen yield 4,176. Every lesson is
built from actual word forms, filtered by a 36-bit letter-skeleton bitmask.

**Recitation** is the second kind of lesson: the Qur'an surah by surah, see *Recitation* below.

**How much of a surah a lesson covers is a setting**, *Ayat per lesson*, from one ayah up to twenty,
defaulting to four. It counts ayat rather than characters, since a character budget is meaningless
from the outside. One ayah at a time is
the setting for drilling a line until it is clean; twenty is for reading through. The count is of
**ayat**, so a prepended basmala never eats into it, and a surah shorter than the limit simply ends.

One caveat worth stating: a single long ayah is still long. Al-Baqara 2:282 runs past a thousand
characters on its own, and no ayah count can make it shorter.

## Recitation

Adaptive practice is the open world; recitation goes through the Qur'an in order, and every surah is
a level.

**Progress is saved ayah by ayah.** The moment the last letter of an ayah is typed, that ayah is
recorded — in the surah's progress and in the per-letter statistics — so a reload, or a week away,
picks the passage up with the cursor after the last finished ayah and the player cued to the next
one. Only the ayah being typed at the time is lost. A finished passage moves the recitation on: the
next lesson starts at the ayah after it. Each surah remembers where it was left, so switching surahs
and back loses nothing.

**A finished passage asks before it is typed again.** Going back to a passage whose ayat are all
typed — or to any passage of a completed surah — shows it as done, with *Type it again* and
*Next passage*, and keystrokes are ignored until one of them is chosen.

**Navigation is precise.** Recitation settings pick the surah and the starting ayah. Under the
passage sit previous and next buttons (also Page Up / Page Down), which cross into the neighbouring
surah at either end, and a progress bar for the surah that shows every ayah typed so far and jumps
to any ayah on a click.

**A surah is complete once every one of its ayat has been typed**, in any order: skip ahead and the
end of the surah sends you back to the first gap. Completing one opens a celebration — the surah's
name, the ayat, accuracy, speed and time across all of its passages, a short burst that
`prefers-reduced-motion` turns off — and offers to continue with the next surah or type this one
again. Typing and the recitation are paused while it is open. Holding 95% accuracy over the whole surah earns a ★.

**The surah map** at `#/recitation` shows all 114 surahs as tiles with a progress ring, a ✓ once complete
and the ★, and continues any of them from where it was left. The order is the mushaf's by default,
or Juz ʿAmma first — An-Nas back to An-Naba, then on from Al-Fatiha — for the order surahs are
usually learnt in. Nothing is locked.

## Ayah marks, and the line the basmala gets

Two things are drawn that you never type.

**Ayah endings** carry the real Unicode mark, `U+06DD` END OF AYAH followed by the number in
Arabic-Indic digits, so the rosette encloses its own numeral. They are tinted differently from the
lesson text, which is the whole point: they read as apparatus, not as characters you owe the
keyboard. They are rendered, never inserted — the session's character array knows nothing about
them, so the build-time guarantee that *the app can never show you a character you cannot type*
still holds for everything that is actually typed. An e2e test types a whole marked passage to
completion with zero errors to keep it that way.

Adding them did require cutting each rendered line into more than one text run. That is safe here
and only here: a cut falls at an ayah boundary, and an ayah boundary is always a space, so no
cursive join is ever split. Both stacked layers are cut identically, so the `clip-path` trick is
untouched; the caret and the recitation band resolve a character index to a text node rather
than assuming one node per line.

**The basmala always gets a centred line of its own.** It is not an ayah in 112 of the surahs that
show it, so it carries no ayah mark there. The recite generator emits a forced line break after it
and the chunker honours that alongside its width rule.

## Recitation audio

The passage a recitation lesson puts on screen is a bounded ayah range, so it has a canonical audio
counterpart. The player under the metrics line plays exactly that range and never runs past it into
the rest of the surah.

**One ayah on screen is exactly one audio file**, which took a correction to get right. The Tanzil
Simple text prepends the basmala to ayah 1 of every surah but al-Fatiha, where it *is* ayah 1, and
at-Tawba, which has none. So 2:1 arrives as `بسم الله الرحمن الرحيم الم` while EveryAyah's
`002001.mp3` is only `الم` — the file recites less than the ayah claims to be.

The fix is to stop pretending the basmala belongs to ayah 1. The recite generator **lifts it out**
and emits it as its own unit, so ayah 1 of al-Baqara is `الم` and nothing else, and every ayah span
in a passage is precisely what its own file recites. The basmala gets its own clip, `001001`, and its
own line, **centred**, the way a mushaf sets it. The 112 surahs this applies to are derived from the
corpus rather than hard-coded, and the clip is `001001` for all of them instead of the per-surah
`SSS000.mp3`, which is missing from the Abdul Basit sets for some surahs; one shared file is both
reliable and cached exactly once. In al-Fatiha nothing is lifted, because there the basmala really is
ayah 1 — it keeps its ayah number and its own mark.

While something plays, the text it corresponds to is tinted. The band is positioned from a DOM
`Range`, so it follows an ayah across a line break, and its height comes from a canvas **ink**
measurement (`actualBoundingBoxAscent`/`Descent`) rather than the layout box. That distinction is
not pedantry: Amiri paints 2.5 px above and 6.4 px below its own metrics box at 48 px, so a band
sized to the line box clips the very harakat a learner is squinting at. The e2e suite measures ink
independently and asserts containment across all three faces at five sizes, over passages chosen for
their tallest stacks — `خَفِيًّا`, `قُرْآنًا`, `حَامِيَةً`, `هُدًى`.

**By default it plays the whole passage** and stops at `toAyah`. Turning *Play the whole passage*
off in settings makes it stop at the end of each ayah instead, which is the unit you repeat when you
are drilling one line rather than listening through.

Rewind and skip move by **ayah**, not by seconds — seconds are meaningless here when ayat run three
to eight of them. Rewind restarts the current ayah if you are more than two seconds into it, and
otherwise steps back one. The basmala is a stop of its own, before ayah 1.

The player is **fully independent of typing**: typing never starts or stops the audio, and the audio
never moves the cursor. The one place the two touch is focus — every control returns focus to the
document as you release it, because the trainer ignores keystrokes aimed at a button, and a play
button that kept focus would silently eat the next space you typed.

Moving on never interrupts it: finish a passage — or a whole surah — while it plays, and it carries
on from the start of the next one; a paused player stays paused. A resumed passage cues the ayah the
cursor resumes at.

The recitation never runs on while typing is paused. A settings dialog, the surah celebration or a
finished passage waiting for **Type it again** holds the player, and it plays on by itself once
you close the dialog or make your choice, if it was playing before. While a finished passage waits,
the player's controls are disabled too: the recitation only ever plays along with typing. Leaving the recitation page for
another one pauses it for good: it waits there, in place, for play to be pressed again.

The strip always names what is playing, or what will play next:

```
Abdul Basit ʿAbd us-Samad · Murattal 64 kbps · 2:1
```

Two sets ship, selectable in settings, **defaulting to Murattal**:

| Set | Character |
|---|---|
| Murattal · 64 kbps | measured, teaching-paced — the default, and the one you can type along to |
| Mujawwad · 128 kbps | the melodic style: slower, ornamented, and three times the bytes per ayah |

Audio is **not bundled**. One MP3 per ayah is fetched from `everyayah.com` on demand — the only
network request the app makes, since corpus and fonts are built in. If the CDN cannot be reached the
strip says `Recitation unavailable` and the lesson stays fully typeable; nothing else depends on it.

### Every ayah is fetched at most once

Each file is fetched **once ever** and then kept on the device, in **IndexedDB** under
`mafatih.audio.v1`, as a `Blob` keyed by its URL. Playback reads from that store and plays an
object URL; the network is touched only on a miss. This is deliberate rather than leaning on the
HTTP cache: the browser is free to evict that whenever it likes, and repeating one ayah twenty
times while you drill a line should not cost twenty round trips — or any at all on the second day.

`localStorage` would have been the wrong store here even though the rest of the profile lives there:
it holds strings, so MP3s would have to be base64'd at +33% size, into a 5 MB budget already shared
with your progress and statistics. IndexedDB stores the blobs as they arrive, under the origin quota.

The ayah after the current one is warmed into the same store while you play, so stepping forward is
instant. That is one file of read-ahead, ~25 KB at 64 kbps — the only audio the app fetches that you
did not ask for.

Settings shows exactly what this has cost — `48.6 KB · 2 ayat` — and **Delete** empties the store.
Deleting only throws away files that can be fetched again; it never touches progress or settings.
Where IndexedDB is unavailable the row is hidden and playback still works, straight from the network.

Volume, mute and *play the whole passage* persist to the profile like every other setting; volume
commits only on pointer release, so dragging the slider does not write `localStorage` on every frame. Where the browser supports it,
`mediaSession` metadata is published, so lock-screen and headset controls drive the player too.

## Commands

| | |
|---|---|
| `pnpm dev` | dev server on :5173 |
| `pnpm build` | corpus + typecheck + production build |
| `pnpm build:corpus` | regenerate `generated/corpus.json` (asserts 6,236 ayat, 0 untypeable) |
| `pnpm test` | engine unit tests (`node --test`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm check` | Biome lint + format |
| `pnpm preview` | serve the production build on :5173 |
| `pnpm cypress:run` | end-to-end suite (needs `pnpm dev` or `pnpm preview` running) |

### On NixOS

Biome and Cypress ship dynamically linked binaries that NixOS cannot execute. Use the nixpkgs builds:

| | |
|---|---|
| `pnpm check:nix` | Biome via `nix-shell` |
| `pnpm check:nix:write` | Biome with autofix |
| `pnpm cypress:nix` | Cypress via `nix-shell` |

Cypress's npm postinstall is disabled in `pnpm-workspace.yaml` (`allowBuilds: cypress: false`) so it
never downloads a binary it cannot run. Two consequences worth knowing: the npm `cypress` package is
pinned to **14.5.4** to match the nixpkgs binary, and TypeScript is pinned to **5.x** because
Cypress 14 loads its config through `ts-node`, which cannot drive the TypeScript 7 native rewrite.

## Layout

```
data/quran-simple.txt    Tanzil source, verbatim, copyright block intact
data/surahs.json         surah metadata
scripts/build-corpus.ts  data/ -> generated/, with the build-time assertions
generated/corpus.json    build output (gitignored), its own bundle chunk
src/engine/              pure TypeScript, zero React
  layout/                Arabic (101) key table from KBDA1, key reach, ligature keys
  corpus/                whitelist normalisation, tier stripping, corpus loader
  lessons/               adaptive, recitation and custom generators, seeded PRNG
  stats/                 per-character recent accuracy and latency, unlock and tier rules
  session/               typing state machine, pauses, line chunking
  recitation/            surah progress, passages, completion, surah order
  audio/                 reciter table, per-ayah URLs, volume clamp
  plan.ts                which lesson to build, and where its session starts
  guards.ts              shared sanitisers for anything read back from storage
src/storage/             profile + settings persistence via localStorage, read back through
                         sanitisers; the IndexedDB ayah-audio store
src/hooks/               trainer state machine, typing keys, recitation player, audio cache,
                         keyboard dock inset, hash route
src/components/          React — header, practice page, passage bar, surah map, recitation
                         player, stats page, dialogs; text measuring in measure.ts
cypress/e2e/             end-to-end tests
```

The `engine/` boundary is the point of the design: every rule is a pure function over plain data,
unit-testable without a DOM, leaving Cypress to cover only what is genuinely visual.

## Testing

**Unit** (`pnpm test`) — normalisation, the Arabic (101) key table and its reach model, the
letter order, ligature keys, bitmask filtering, recent accuracy and the pause cap, unlock and tier
rules, simulated learners typing their way up the alphabet, seeded-RNG reproducibility, line
chunking, the session machine (ligature strokes, resumed sessions, active time), recitation
progress (ayah ranges, passages, resuming, completion, surah order), where a session starts, metric
formatting, per-ayah audio URLs, basmala detection, ayah spans and the storage sanitisers.

**End-to-end** (`pnpm cypress:run`) — `cy.typeArabic()` dispatches `keydown` with the correct `key`,
`code` and `shiftKey` resolved through the key table, with real delays between keystrokes and
optional mistakes; `cy.type()` cannot express "Shift+Q produces a fatha", so without it none of the
diacritic tests could be written.

Covered: lesson rendering and RTL, cursor advance, refusal to advance past an error, every haraka on
the shift layer, lam-alef ligature keys (highlighted, one stroke, scored as their own key) and the
two-letter path, letters earned by typing from a fresh profile — cleanly, with mistakes, and out of a
stuck profile — tier progression, profile persistence, the layout guard, cursive shaping, caret
tracking, the on-screen keyboard and its row stagger, hiding the keyboard, font selection and size,
the page following the cursor down a long passage, the dialogs, recitation (passages advancing,
navigation by button, key, picker and progress bar, resuming a level after a reload, finished
passages asking before a redo, surah completion and its celebration, the surah map, Juz ʿAmma order,
resets), the recitation player (transport, label, volume, running on through a passage and into the
next one, holding for dialogs, the celebration and finished passages, pausing on another page, the ayah mark, the audio cache, a CDN failure leaving the lesson
typeable, controls never swallowing a keystroke), the stats page, search and sharing metadata, and
text direction — English prose computes as `ltr` with its trailing period intact while the lesson
stays `rtl`.

Lesson generation is seeded (`?seed=1234`) so every test is deterministic.

## What ships

The corpus is 83% of the bytes, so it gets **its own chunk**:

| | raw | gzip |
|---|---|---|
| `index-*.js` — React and the whole app | 271 kB | **85 kB** |
| `corpus-*.js` — 6,236 ayat | 1,301 kB | 261 kB |

Splitting them does not move a single byte off the wire; both are statically imported and the module
graph loads both before first paint, since either mode needs the text to build a lesson. What it buys
is **cache separation**. The corpus is immutable — it is the Qur'an, asserted at exactly 6,236 ayat —
while app code changes every deploy. Bundled together, shipping a one-line fix made every returning
visitor re-download 261 kB of scripture. Split, they re-download 85 kB and keep the rest.

That leaves a chunk far over Vite's 500 kB advice, so the warning limit is raised to 1,400 kB: for
this app the data *is* the app, it is needed before first paint in either mode, and Rolldown already
compiles the JSON to `JSON.parse`, the fast path. The corpus is large because it has to be. Anything
else growing past the limit still warns.

## Production

`pnpm build` writes a static site to `dist/`; any static host serves it. Two environment variables
shape it: `BASE_PATH` when the site lives under a sub-path, and `SITE_URL` for the canonical URL,
Open Graph tags, `robots.txt` and `sitemap.xml`. The GitHub Pages workflow sets both.

- **Content Security Policy.** The build adds a CSP `<meta>` tag: scripts, styles, fonts and images
  from the site itself only, with `everyayah.com` allowed for recitation audio and `blob:` for the
  cached copies. No inline script runs.
- **Crash screen.** An error boundary replaces a blank page with **Reload** and **Start over**,
  which clears the saved profile first, for the case where corrupt local data is the cause.
- **Privacy.** No cookies, analytics or third-party fonts. The only third-party request is the
  recitation audio. `#/privacy` says so for users.
- `pnpm preview` serves the built site on :5173, so the end-to-end suite can run against the
  production build as well as the dev server.

## Attribution

Qur'an text: **Tanzil Project**, Simple (imlaei), version 1.1 — <https://tanzil.net> — used under
**Creative Commons Attribution 3.0**. `data/quran-simple.txt` is included verbatim with its
copyright block intact; `generated/corpus.json` is a clearly-marked derived artifact, normalised to
the characters the Arabic (101) keyboard can produce.

Recitation audio: **Abdul Basit ʿAbd us-Samad**, streamed per ayah from the **EveryAyah** archive
— <https://everyayah.com> — sets `Abdul_Basit_Murattal_64kbps` and `Abdul_Basit_Mujawwad_128kbps`.
Nothing is redistributed: the files are fetched by the browser while a recitation level is open, and
no audio ships in the build.

The keyboard table is transcribed from Microsoft's `KBDA1` (Arabic 101) layout, cross-checked against
`xkeyboard-config`'s `symbols/ara`, `xkb_symbols "basic"`.