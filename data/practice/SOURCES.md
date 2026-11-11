# Practice word list

`words.tsv` holds the words that Practice drills: one fully vocalized word per line with the frequency rank of its
spelling and its part of speech. It is produced by `scripts/extract-words.ts` and then reviewed by a native reader.
`pnpm build:data` checks the committed file on every build.

## Sources

| Source | What it gives | Licence |
|---|---|---|
| English Wiktionary, machine-readable extract by [kaikki.org](https://kaikki.org/dictionary/Arabic/) (`kaikki.org-dictionary-Arabic.jsonl.gz`, built 2026-10-30) | Entries, senses and fully vocalized inflected forms | CC BY-SA 4.0 and GFDL |
| [FrequencyWords](https://github.com/hermitdave/FrequencyWords) `content/2018/ar/ar_50k.txt` (from OpenSubtitles 2018) | How common each unvocalized spelling is | CC BY-SA 4.0 |

The word list is a derivative of both and is shared under **CC BY-SA 4.0**. No word comes from the Qur'an text, and
the Qur'an text is never read by the extraction.

## Rules

1. Only nouns, adjectives, verbs and function words (prepositions, pronouns, particles, conjunctions, adverbs,
   determiners) whose spelling is in the frequency list. Proper nouns are never taken.
2. An entry needs at least one ordinary sense: senses marked obsolete, archaic, rare, dated, dialectal, vulgar,
   offensive, slang, poetic and the like do not count, nor do entries that only point to another entry.
3. Forms taken: for nouns and adjectives the indefinite singular in the three cases (so no word carries the definite
   article); for verbs the third person masculine singular past and non-past; for function words the headword.
   At most six forms per entry.
4. A form must be typeable on the Arabic (101) keyboard, at least two letters long and fully vocalized. Marks are
   stored shadda first.
5. Where a spelling is also a function word, only the function word is kept: the frequency count of such a spelling
   belongs to the function word.
6. `blocklist.txt` removes spellings in every vocalization: names and words for Allah, the Qur'an and scripture,
   prophets, messengers and angels, labels of unbelief, and words unsuitable for a drill.
7. `reject.txt` removes single vocalized words after review.
8. The 10,000 words with the most frequent spellings are kept.

## Known limit

The rank belongs to the spelling, not to the vocalized word, so a rare word that shares its spelling with a common
one inherits its rank. Rule 5 and `reject.txt` remove the cases that matter most; the rest is why the list is reviewed
by a reader.

## Regenerating

Download the two sources into an empty directory outside the repository, then:

```bash
pnpm exec tsx scripts/extract-words.ts <path to the .jsonl.gz> <path to ar_50k.txt>
pnpm build:data
```
