import { isTypeable, MARKS } from "~/keyboard/typeable.ts";
import type { PracticeWord } from "~/practice/words.ts";
import { canonicalizeMarks, FATHATAN, isFullyVocalized, skeleton } from "~/text/arabic.ts";
import type { WiktionaryEntry } from "./wiktionary.ts";

export interface Rules {
  readonly blocklist: ReadonlySet<string>;
  readonly reject: ReadonlySet<string>;
  readonly limit: number;
}

const DECLINED = ["noun", "adj"];
const UNINFLECTED = ["prep", "adv", "conj", "particle", "pron", "det"];
const CASES = ["nominative", "accusative", "genitive"];
const OTHER_NUMBERS = ["dual", "plural"];
const VERB_FORM = ["active", "indicative", "masculine", "singular", "third-person"];
const TENSES = ["past", "non-past"];
const MAX_FORMS_PER_ENTRY = 6;
const ALEF = "ا";

const UNWANTED_SENSES: ReadonlySet<string> = new Set([
  "obsolete",
  "archaic",
  "rare",
  "dated",
  "dialectal",
  "vulgar",
  "offensive",
  "derogatory",
  "pejorative",
  "slur",
  "slang",
  "colloquial",
  "nonstandard",
  "misspelling",
  "historical",
  "poetic",
  "uncommon",
  "abbreviation",
  "form-of",
  "alt-of",
  "no-gloss",
]);

function hasOrdinarySense(entry: WiktionaryEntry): boolean {
  return (entry.senses ?? []).some(
    (sense) => (sense.glosses ?? []).length > 0 && !(sense.tags ?? []).some((tag) => UNWANTED_SENSES.has(tag)),
  );
}

function isWantedForm(pos: string, tags: readonly string[]): boolean {
  const has = (tag: string) => tags.includes(tag);
  if (DECLINED.includes(pos)) {
    return has("indefinite") && has("singular") && !OTHER_NUMBERS.some(has) && !has("informal") && CASES.some(has);
  }
  if (pos === "verb") {
    return VERB_FORM.every(has) && TENSES.some(has);
  }
  return UNINFLECTED.includes(pos) && has("canonical");
}

function isUsable(word: string): boolean {
  return [...word].every(isTypeable) && isFullyVocalized(word) && skeleton(word).length > 1;
}

function spellingsOf(word: string): string[] {
  const bare = skeleton(word);
  const endsInTanweenAlef = word.endsWith(FATHATAN + ALEF);
  return endsInTanweenAlef ? [bare, bare.slice(0, -1)] : [bare];
}

function isBlocked(word: string, blocklist: ReadonlySet<string>): boolean {
  return spellingsOf(word).some((spelling) => blocklist.has(spelling));
}

export function wordsOf(entry: WiktionaryEntry, ranks: ReadonlyMap<string, number>): PracticeWord[] {
  const { pos, word: headword } = entry;
  const rank = headword === undefined ? undefined : ranks.get(headword);
  if (pos === undefined || rank === undefined || !hasOrdinarySense(entry)) {
    return [];
  }
  const words = (entry.forms ?? [])
    .filter((form) => isWantedForm(pos, form.tags ?? []))
    .map((form) => canonicalizeMarks(form.form ?? ""))
    .filter(isUsable);
  return [...new Set(words)].slice(0, MAX_FORMS_PER_ENTRY).map((word) => ({ word, rank, pos }));
}

function byRankThenSpelling(a: PracticeWord, b: PracticeWord): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return a.word < b.word ? -1 : a.word > b.word ? 1 : 0;
}

export function selectWords(rows: Iterable<PracticeWord>, rules: Rules): PracticeWord[] {
  const best = new Map<string, PracticeWord>();
  for (const row of rows) {
    const known = best.get(row.word);
    const allowed = !rules.reject.has(row.word) && !isBlocked(row.word, rules.blocklist);
    if (allowed && (known === undefined || row.rank < known.rank)) {
      best.set(row.word, row);
    }
  }
  const functionWordRanks = new Set(
    [...best.values()].filter((row) => UNINFLECTED.includes(row.pos)).map((row) => row.rank),
  );
  const sorted = [...best.values()]
    .filter((row) => UNINFLECTED.includes(row.pos) || !functionWordRanks.has(row.rank))
    .sort(byRankThenSpelling);
  let end = 0;
  for (let index = 1; index <= sorted.length && index <= rules.limit; index += 1) {
    if (sorted[index]?.rank !== sorted[index - 1]?.rank) {
      end = index;
    }
  }
  return sorted.slice(0, end);
}

export function extractWords(
  entries: Iterable<WiktionaryEntry>,
  ranks: ReadonlyMap<string, number>,
  rules: Rules,
): PracticeWord[] {
  const blockedHeadword = (entry: WiktionaryEntry) => rules.blocklist.has(entry.word ?? "");
  return selectWords(
    [...entries].filter((entry) => !blockedHeadword(entry)).flatMap((entry) => wordsOf(entry, ranks)),
    rules,
  );
}

export function parseList(text: string): Set<string> {
  const lines = text.split("\n").map((line) => line.trim());
  return new Set(lines.filter((line) => line !== "" && !line.startsWith("#")));
}

export function violationsOf(rows: readonly PracticeWord[], rules: Rules): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  rows.forEach((row, index) => {
    const { word, rank } = row;
    const previous = rows[index - 1];
    if (!isFullyVocalized(word)) {
      problems.push(`${word} is not fully vocalized`);
    }
    if (![...word].every(isTypeable)) {
      problems.push(`${word} cannot be typed on the keyboard`);
    }
    if (canonicalizeMarks(word) !== word) {
      problems.push(`${word} has a vowel before its shadda`);
    }
    if (seen.has(word)) {
      problems.push(`${word} is listed twice`);
    }
    if (isBlocked(word, rules.blocklist)) {
      problems.push(`${word} is on the blocklist`);
    }
    if (rules.reject.has(word)) {
      problems.push(`${word} is on the reject list`);
    }
    if (!Number.isInteger(rank) || rank < 1) {
      problems.push(`${word} has the rank ${rank}`);
    }
    if (previous !== undefined && byRankThenSpelling(previous, row) > 0) {
      problems.push(`${word} is out of order`);
    }
    seen.add(word);
  });
  if (rows.length > rules.limit) {
    problems.push(`the list holds more than ${rules.limit} words`);
  }
  return problems;
}

export interface Coverage {
  readonly starterWords: number;
  readonly starterSpellings: number;
  readonly wordsPerStarterLetter: ReadonlyMap<string, number>;
  readonly wordsPerMark: ReadonlyMap<string, number>;
  readonly wordsWithoutMarks: number;
}

export function coverageOf(rows: readonly PracticeWord[], starterLetters: readonly string[]): Coverage {
  const words = rows.map((row) => row.word);
  const starter = words.filter((word) => [...skeleton(word)].every((letter) => starterLetters.includes(letter)));
  const countWith = (list: readonly string[], char: string) => list.filter((word) => word.includes(char)).length;
  return {
    starterWords: starter.length,
    starterSpellings: new Set(starter.map(skeleton)).size,
    wordsPerStarterLetter: new Map(starterLetters.map((letter) => [letter, countWith(starter, letter)])),
    wordsPerMark: new Map(MARKS.map((mark) => [mark, countWith(words, mark)])),
    wordsWithoutMarks: words.filter((word) => !MARKS.some((mark) => word.includes(mark))).length,
  };
}
