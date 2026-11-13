# Practice word list

`words.tsv` holds the words that Practice drills: one fully vocalized word per line, a tab, and the frequency rank of
its spelling. It is produced by `scripts/extract-words.ts`; no native reader has verified it. `pnpm build:data`
checks the committed file on every build.

**Review state: not human verified.** The lists were curated while the pipeline was built. On 2026-11-12 the owner
skimmed `review-report.txt` and found it fine, but did not check every word. The owner decided to ship Practice as it is and to say so on the About page. The provisional policy
points were confirmed: the devil, the jinn and the names of hell stay blocked, and ordinary religious vocabulary stays.
The licence question below was set aside by the owner as not required.

## Sources

| Source | What it gives | Licence |
|---|---|---|
| English Wiktionary, machine-readable extract by [kaikki.org](https://kaikki.org/dictionary/Arabic/) (`kaikki.org-dictionary-Arabic.jsonl.gz`, built 2026-10-30) | Entries, senses and fully vocalized inflected forms | CC BY-SA 4.0 and GFDL |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/ar/ar_50k.txt` (from OpenSubtitles 2018) | How common each unvocalized spelling is | CC BY-SA 4.0 |

The word list is a derivative of both and is shared under **CC BY-SA 4.0**. No word comes from the Qur'an text, and
the Qur'an text is never read by the extraction.

## Rules

1. Only nouns, adjectives, verbs and function words (prepositions, pronouns, particles, conjunctions, adverbs,
   determiners) whose headword is in the frequency list. Proper nouns are never taken.
2. An entry needs at least one ordinary sense: senses marked obsolete, archaic, rare, dated, dialectal, vulgar,
   offensive, slang, poetic and the like do not count, nor do entries that only point to another entry.
3. A noun, adjective or verb is taken only when the frequency list also knows another of its own inflected forms (a
   definite, dual, plural or feminine form; another person or tense). Without that, the frequency of the spelling
   belongs to some other word: `تحاول` is frequent as "you try", not as the rare verb `تَحَاوَلَ`.
4. Forms taken: for nouns and adjectives the indefinite singular in the three cases (so no word carries the definite
   article, and a form that starts with it is dropped); for verbs the third person masculine singular past and
   non-past; for function words the headword. At most six forms per entry.
5. A form must be typeable on the Arabic (101) keyboard, at least two letters long and fully vocalized. Marks are
   stored shadda first.
6. Each form carries the rank of its own spelling, and a form whose spelling is not in the frequency list is left
   out. The three cases of a noun share the rank of the spelling without the tanween alef, unless the spelling with
   it is more frequent (`شُكْرًا`).
7. Where a spelling is also a function word, only the function word is kept: the frequency count of such a spelling
   belongs to the function word.
8. `blocklist.txt` removes spellings in every vocalization, and every form of an entry whose headword is listed:
   names and words for Allah, the Qur'an and scripture, prophets, messengers and angels, labels of unbelief, the
   devil, the jinn and the names of hell, and words unsuitable for a drill (sexual and bodily words, drink and
   drugs, insults, terror). It over-blocks on purpose: `رب` also removes the particle `رُبَّ`, and that is the
   right side to err on.
9. `reject.txt` removes single vocalized words after review; the same spelling with other vowels stays. It may be
   written with the vowel before or after a shadda. The extraction reports lines that no longer match any word.
10. The words with the most frequent spellings are kept, up to 10,000; the words of one spelling are never split.

Ordinary religious vocabulary (`صَلَاةٌ`, `دِينٌ`, `مُؤْمِنٌ`) and everyday words that are divine names
only when definite (`كَبِيرٌ`, `وَاحِدٌ`) stay; the blocklist is for names and for the sacred text itself.

## Known limit

Wiktionary lists every reading of a spelling, and nothing in it says which reading is the common one. Rules 3, 6 and
7 remove most rare readings that would borrow the rank of a frequent spelling, and every spelling among the 3,000
most frequent that has more than one reading was read and trimmed by hand in `reject.txt`. Below that, rare readings
remain (`عَلَّاقَةٌ` next to `عَلَاقَةٌ`). They are real words, fully vocalized, and safe to type; they are why the
list is reviewed by a reader. Rule 3 also loses a few real words whose other forms happen to be missing from the
subtitle corpus (`أَخَّرَ`, `تَمَامٌ`).

## Regenerating

Download the two sources into an empty directory outside the repository, then:

```bash
pnpm exec tsx scripts/extract-words.ts <path to the .jsonl.gz> <path to ar_50k.txt> > data/practice/review-report.txt
```

```bash
pnpm build:data
```

`review-report.txt` holds the counts of every step, the stale reject lines, the first 400 words a fresh learner can
be given, a sample of the rest, every frequent spelling with more than one reading, and what the two lists removed.
