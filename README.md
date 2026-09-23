# مفاتيح · Mafatih

A keybr.com for Arabic — touch-typing practice **with diacritics**, built on Qur'anic text.

Arabic typing has three problems Latin typing does not, and all three had to be solved before a
single lesson could render.

## 1. Is the text even typeable?

Qur'anic orthography carries marks no standard keyboard can produce. The whole Qur'an, measured:

| | |
|---|---|
| Distinct codepoints in the entire text | **46** |
| Untypeable on the standard Arabic 102 layout | **1** (`U+0670`, dagger alef — 3,330 occurrences) |
| Untypeable after normalisation | **0** |
| Distinct fully-diacritised word forms | 18,198 |

The single rule is **drop `U+0670`**. Verified against all 411 words containing it, dropping it
yields exactly the standard modern spelling every time (`هٰذا`→`هذا`, `علىٰ`→`على`, `ذٰلك`→`ذلك`).

Edition choice does the rest of the work. Tanzil ships several; the **Simple (imlaei)** text has 46
distinct codepoints where the Uthmani text has 62. The 17 extras are precisely the untypeable
recitation apparatus — wasla `ٱ`, maddah `ٓ`, the silent-letter zero `۟`, small waw/yeh, tatweel,
small high/low meem. Simple contains none of them, nor waqf/sajda/juz markers, nor punctuation.

Normalisation is nonetheless a **whitelist**, not a blacklist: it keeps the 73 typeable codepoints —
36 letters, 8 harakat, the space, and the 28 punctuation marks (`. ، : ؛ ؟ ! " ( ) [ ] { } …`) that
*every* offered layout can produce — and drops everything else. Deriving the set from the
intersection of the layouts, rather than from one of them, is what makes a lesson typeable no matter
which layout the reader has selected; tatweel is the one deliberate exclusion, being an elongation
glyph with no phonetic content. It cannot miss a mark nobody thought of, and it makes the pipeline
edition-agnostic — point it at Uthmani text, or at hadith or plain MSA prose, and it just works.

`pnpm build:corpus` fails the build unless the output contains exactly 6,236 ayat, the surah
metadata accounts for every one of them, and zero characters fall outside the layout's typeable set.
*The app can never show you a character you cannot type* is a build-time guarantee, not a hope.

The artifact stores ayat as **text only**. Their surah and ayah numbers used to be repeated on every
record and are now derived from the surah metadata at load, since the ayat are in order and each
surah declares its count — 49 kB of raw JSON, 19 kB gzipped, that said nothing the file did not
already know.

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

Mafatih reads the characters your OS produces, so **an Arabic layout must be active**:

```sh
setxkbmap ara -variant mac   # Arabic (Macintosh) — the default
setxkbmap ara                # Arabic (102)
```

If the app sees Latin keystrokes it says so rather than silently scoring them as errors.

```sh
pnpm install
pnpm build:corpus
pnpm dev
```

## Keyboard layouts

Two layouts ship, selectable in settings, **defaulting to Arabic (Macintosh)** — GNOME's name for
the xkb `ara(mac)` variant. Both tables are transcribed from `xkeyboard-config`; the Macintosh one
was resolved with `xkbcli compile-keymap --layout ara --variant mac`, since it is a partial override
over `ara(digits)` over `ara(basic)` rather than a standalone definition.

Both reach all 73 typeable codepoints — asserted in the unit tests, so neither can drift. They
differ in ways that matter at the keycap:

| | Arabic (Macintosh) | Arabic (102) |
|---|---|---|
| harakat | all eight on the top letter row, `Q`–`I` | scattered across `Q W E R`, `A S`, `X`, backtick |
| shadda | `I` | backtick |
| hamza carriers `أ إ ؤ ئ ء` | bottom row | scattered |
| lam-alef `ﻻ` single key | absent | `B` |
| backtick key | tatweel | `ذ` |

The Macintosh arrangement is materially better for this app: with 43% of keystrokes on the shift
layer, having every haraka under one row of the home position matters. Because the ligature key is
absent there, `لا` is typed as two keys — the session accepts either path regardless of which layout
is displayed, since input is read from the character your OS emits, not from the key position.

The keyboard **docks to the bottom of the window**, a margin clear of the edge, and floats over the
lesson on a faintly tinted, blurred panel rather than sitting under it. A long passage scrolls
past a keyboard that stays where your eyes already are. It can also be hidden entirely from
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
not restart the lesson — only mode, diacritic tier and surah do, since only those change the text.

## Interface

Three surfaces, and the practice one is deliberately almost empty: a lesson, a metrics line, and the
on-screen keyboard.

A lesson ends the instant its last character lands, and the next one is already on screen — nothing
to click, nothing to acknowledge. The run that just ended survives as the `last` readout beside the
live metrics, so the numbers for it are still there while you type on.

| | |
|---|---|
| Practice | the lesson itself; `6/36 · none` in the header is the whole progress display |
| Stats | its own route at `#/stats` — tiles, the per-character bars, and the last ten lessons |
| Settings | a modal `<dialog>`, closed on Escape, on a backdrop click or on **Done** |
| Recitation | a second `<dialog>` reached from Settings — surah, length, reciter, cache |

Settings holds what applies to every lesson: mode, diacritics, layout, font. Everything that only
means something in Recite mode lives one step in, behind **Recitation**, which keeps the first
dialog to seven rows instead of thirteen. Both are the same `Modal` shell, and only one is ever
open — the shell ignores the `close` event the browser fires when a dialog is closed
programmatically, so handing over from one to the other does not read as a dismissal.

In **Recite** mode a fourth surface appears under the metrics: a player for the passage on screen,
recited by **Abdul Basit ʿAbd us-Samad**. See *Recitation* below.

Keystrokes are only scored on the practice route with the dialog closed, so typing at the stats page
or while changing a setting cannot pollute your per-character statistics.

Everything in settings is written to `localStorage` on change, under the same
`mafatih.profile.v1` key as progress and history, and is read back through a whitelist — an unknown
font, an out-of-range surah or a hand-edited font size falls back to its default rather than
reaching the app. **Reset progress** clears progress, statistics and history but keeps the settings,
since they are not progress.

## Adaptive lessons from real words

Letters unlock in corpus-frequency order:

```
ا ل ن م و ي ه ر ب ك ت ع أ ف ق س د إ ذ ح ج ى خ ة ش ص ض ء آ ز ث ط غ ئ ظ ؤ
```

keybr must invent pseudo-words for a restricted alphabet. Mafatih never does — even six unlocked
letters yield 190 real Qur'anic word forms, ten yield 1,158, fifteen yield 4,909. Every lesson is
built from actual word forms, filtered by a 36-bit letter-skeleton bitmask.

**Recite** mode is the second mode: continuous ayat with a surah picker.

**How much of a surah a lesson covers is a setting.** It used to be a fixed 180-character budget,
which is meaningless from the outside: you pick al-Baqara and get however much of it happens to fit.
*Ayat per lesson* replaces it, from one ayah up to twenty, defaulting to four. One ayah at a time is
the setting for drilling a line until it is clean; twenty is for reading through. The count is of
**ayat**, so a prepended basmala never eats into it, and a surah shorter than the limit simply ends.

One caveat worth stating: a single long ayah is still long. Al-Baqara 2:282 runs past a thousand
characters on its own, and no ayah count can make it shorter.

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
untouched; the caret and the recitation band now resolve a character index to a text node rather
than assuming one node per line.

**The basmala always gets a centred line of its own.** It is not an ayah in 112 of the surahs that
show it, so it carries no ayah mark there. The recite generator emits a forced line break after it
and the chunker honours that alongside its width rule.

## Recitation

The passage a recite lesson puts on screen is a bounded ayah range, so it has a canonical audio
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
| `pnpm cypress:run` | end-to-end suite (needs `pnpm dev` running) |

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
  layout/                xkb-derived key table, ligature expansion
  corpus/                whitelist normalisation, tier stripping, corpus loader
  lessons/               adaptive + recite generators, seeded PRNG
  stats/                 per-character EWMA, unlock and tier rules
  session/               typing state machine, line chunking
  audio/                 reciter table, per-ayah URLs, volume clamp
src/storage/             profile + settings persistence via localStorage, read back through a
                         whitelist; the IndexedDB ayah-audio store
src/hooks/               trainer state machine binding, recitation player, audio cache, hash route
src/components/          React — practice chrome, recitation bar, stats page, both dialogs
cypress/e2e/             114 end-to-end tests
```

The `engine/` boundary is the point of the design: every rule is a pure function over plain data,
unit-testable without a DOM, leaving Cypress to cover only what is genuinely visual.

## Testing

**Unit** (`pnpm test`) — 106 tests over normalisation, both layout tables, ligature expansion, bitmask
filtering, unlock and tier rules, seeded-RNG reproducibility, line chunking, the session machine,
metric formatting, font-size snapping, per-ayah audio URLs, basmala detection, ayah spans, byte formatting and the
settings whitelist.

**End-to-end** (`pnpm cypress:run`) — 114 tests. `cy.typeArabic()` dispatches `keydown` with the
correct `key`, `code` and `shiftKey` resolved through the layout table; `cy.type()` cannot express
"Shift+Q produces a fatha", so without it none of the diacritic tests could be written.

Covered: lesson rendering and RTL, cursor advance, refusal to advance past an error, every haraka on
the shift layer, the lam-alef ligature satisfying two cursor positions in one press *and* in two,
tier progression, letter unlocking, profile persistence, recite mode, the layout guard, cursive
shaping (a joined letter measured narrower than an isolated one), caret tracking, the on-screen
keyboard, layout switching, hiding the keyboard, font selection, font size (including that the caret
is re-measured and the line re-chunked after a resize), the settings dialog opening, closing three
ways and swallowing keystrokes while open, the recitation dialog opening from it and handing back,
the lesson holding exactly the number of ayat asked for, the stats route surviving a reload, the recitation player (transport by ayah, the label naming style and bitrate, persisted volume, running on through a passage and stopping at the end of one ayah when told to,
the mark enclosing every character of the ayah being recited, a warm cache reaching the network not at all across a reload, deleting
the cached audio, a stubbed CDN failure leaving the lesson typeable, and that a tapped control never
swallows the keystroke after it), and text direction —
English prose is asserted to compute as `ltr` with its trailing period intact, while the lesson stays
`rtl`.

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

That leaves a chunk far over Vite's 500 kB advice, and the warning stays on. It is worth knowing what
it is telling you, though: for this app the data *is* the app, it is needed before first paint in
either mode, and Rolldown already compiles the JSON to `JSON.parse`, the fast path. The corpus is
large because it has to be.

## Attribution

Qur'an text: **Tanzil Project**, Simple (imlaei), version 1.1 — <https://tanzil.net> — used under
**Creative Commons Attribution 3.0**. `data/quran-simple.txt` is included verbatim with its
copyright block intact; `generated/corpus.json` is a clearly-marked derived artifact, normalised to
the characters reachable on the standard Arabic 102 keyboard.

Recitation audio: **Abdul Basit ʿAbd us-Samad**, streamed per ayah from the **EveryAyah** archive
— <https://everyayah.com> — sets `Abdul_Basit_Murattal_64kbps` and `Abdul_Basit_Mujawwad_128kbps`.
Nothing is redistributed: the files are fetched by the browser at play time and no audio ships in
the build.

Keyboard tables are transcribed from `xkeyboard-config`, `symbols/ara` — `xkb_symbols "basic"` and
`xkb_symbols "mac"`.
