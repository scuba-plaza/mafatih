import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { coverageOf, parseList, type Rules, removalOf, selectWords, violationsOf, wordsOf } from "./practice-rules.ts";
import type { WiktionaryEntry } from "./wiktionary.ts";

const OPEN: Rules = { blocklist: new Set(), reject: new Set(), limit: 100 };
const RANKS = new Map([
  ["كتاب", 10],
  ["كتب", 20],
  ["من", 2],
  ["مد", 30],
  ["يمد", 31],
  ["يكتب", 21],
  ["لكن", 5],
  ["رب", 40],
  ["قرآن", 41],
  ["نوح", 42],
  ["التهم", 43],
]);

function noun(
  word: string,
  stem: string,
  senses: WiktionaryEntry["senses"] = [{ glosses: ["thing"] }],
): WiktionaryEntry {
  return {
    word,
    pos: "noun",
    senses,
    forms: [
      { form: stem, tags: ["canonical"] },
      { form: stem, tags: ["indefinite", "informal", "singular", "triptote"] },
      { form: `ال${stem}`, tags: ["definite", "informal", "singular", "triptote"] },
      { form: `${stem}ٌ`, tags: ["indefinite", "nominative", "singular", "triptote"] },
      { form: `ال${stem}ُ`, tags: ["definite", "nominative", "singular", "triptote"] },
      { form: `${stem}ُ`, tags: ["construct", "nominative", "singular", "triptote"] },
      { form: `${stem}ًا`, tags: ["accusative", "indefinite", "singular", "triptote"] },
      { form: `${stem}ٍ`, tags: ["genitive", "indefinite", "singular", "triptote"] },
      { form: "كُتُبٌ", tags: ["indefinite", "nominative", "plural", "triptote"] },
      { form: `${stem}َانِ`, tags: ["dual", "indefinite", "nominative", "singular", "triptote"] },
      { form: `${stem}َيْنِ`, tags: ["accusative", "dual", "indefinite", "singular", "triptote"] },
    ],
  };
}

const SHADDA = String.fromCodePoint(0x651);
const FATHA = String.fromCodePoint(0x64e);
const VOWEL_FIRST_MADDA = `\u0645${FATHA}\u062F${FATHA}${SHADDA}`;
const SHADDA_FIRST_MADDA = `\u0645${FATHA}\u062F${SHADDA}${FATHA}`;

function extract(entries: WiktionaryEntry[], rules: Rules = OPEN) {
  return selectWords(
    entries.flatMap((entry) => wordsOf(entry, RANKS)),
    rules,
  );
}

function words(entries: WiktionaryEntry[], rules: Rules = OPEN): string[] {
  return extract(entries, rules).map((row) => row.word);
}

test("a noun gives its three indefinite singular case forms and nothing definite, construct, dual or plural", () => {
  expect(extract([noun("كتاب", "كِتَاب")])).toEqual([
    { word: "كِتَابًا", rank: 10 },
    { word: "كِتَابٌ", rank: 10 },
    { word: "كِتَابٍ", rank: 10 },
  ]);
});

test("a verb gives its third person masculine singular past and non-past", () => {
  const verb: WiktionaryEntry = {
    word: "كتب",
    pos: "verb",
    senses: [{ glosses: ["to write"] }],
    forms: [
      { form: "كَتَبَ", tags: ["canonical", "form-i"] },
      { form: "كَتَبْتُ", tags: ["active", "first-person", "indicative", "masculine", "past", "perfective", "singular"] },
      { form: "كَتَبَ", tags: ["active", "indicative", "masculine", "past", "perfective", "singular", "third-person"] },
      {
        form: "يَكْتُبُ",
        tags: ["active", "imperfective", "indicative", "masculine", "non-past", "singular", "third-person"],
      },
      {
        form: "يَكْتُبَ",
        tags: ["active", "imperfective", "masculine", "non-past", "singular", "subjunctive", "third-person"],
      },
      { form: "كُتِبَ", tags: ["indicative", "masculine", "passive", "past", "perfective", "singular", "third-person"] },
    ],
  };
  expect(words([verb])).toEqual(["كَتَبَ", "يَكْتُبُ"]);
});

test("a verb is taken only when the frequency list also knows another of its conjugated forms", () => {
  const forms = (past: string, nonPast: string, mine: string): WiktionaryEntry["forms"] => [
    { form: past, tags: ["active", "indicative", "masculine", "past", "perfective", "singular", "third-person"] },
    { form: mine, tags: ["active", "first-person", "indicative", "masculine", "past", "perfective", "singular"] },
    {
      form: nonPast,
      tags: ["active", "imperfective", "indicative", "masculine", "non-past", "singular", "third-person"],
    },
  ];
  const senses = [{ glosses: ["to do"] }];
  const borrowed: WiktionaryEntry = {
    word: "تحاول",
    pos: "verb",
    senses,
    forms: forms("تَحَاوَلَ", "يَتَحَاوَلُ", "تَحَاوَلْتُ"),
  };
  const real: WiktionaryEntry = { word: "حاول", pos: "verb", senses, forms: forms("حَاوَلَ", "يُحَاوِلُ", "حَاوَلْتُ") };
  const ranks = new Map([
    ["تحاول", 50],
    ["حاول", 60],
    ["حاولت", 70],
    ["يحاول", 80],
  ]);
  expect(wordsOf(borrowed, ranks)).toEqual([]);
  expect(wordsOf(real, ranks).map((candidate) => candidate.word)).toEqual(["حَاوَلَ", "يُحَاوِلُ"]);
});

test("a noun is taken only when the frequency list also knows another of its forms", () => {
  const plea = {
    ...noun("أرجوك", "أَرْجُوك"),
    forms: noun("أرجوك", "أَرْجُوك").forms?.filter((form) => form.form !== "كُتُبٌ"),
  };
  const only = new Map([["أرجوك", 296]]);
  expect(wordsOf(plea, only)).toEqual([]);
  expect(wordsOf(plea, new Map([...only, ["أرجوكا", 900]]))).toEqual([]);
  expect(wordsOf(plea, new Map([...only, ["الأرجوك", 900]]))).toHaveLength(3);
  expect(wordsOf(plea, new Map([...only, ["أرجوكين", 900]]))).toHaveLength(3);
});

test("each form carries the rank of its own spelling, and a form the frequency list lacks is left out", () => {
  const adjective = (word: string, stem: string): WiktionaryEntry => ({
    word,
    pos: "adj",
    senses: [{ glosses: ["such"] }],
    forms: [
      { form: `${stem}ٌ`, tags: ["indefinite", "masculine", "nominative", "singular"] },
      { form: `${stem}ًا`, tags: ["accusative", "indefinite", "masculine", "singular"] },
      { form: `ال${stem}ُ`, tags: ["definite", "masculine", "nominative", "singular"] },
      { form: `${stem}َةٌ`, tags: ["feminine", "indefinite", "nominative", "singular"] },
    ],
  });
  const ranks = new Map([
    ["كبير", 100],
    ["كبيرة", 150],
    ["الكبير", 300],
    ["حساب", 50],
    ["الحساب", 60],
    ["شكر", 500],
    ["شكرا", 20],
    ["الشكر", 600],
  ]);
  const ranked = (entry: WiktionaryEntry) => wordsOf(entry, ranks).map((candidate) => [candidate.word, candidate.rank]);
  expect(ranked(adjective("كبير", "كَبِير"))).toEqual([
    ["كَبِيرٌ", 100],
    ["كَبِيرًا", 100],
    ["كَبِيرَةٌ", 150],
  ]);
  expect(ranked(adjective("حساب", "حَسَّاب")).map(([, rank]) => rank)).toEqual([50, 50]);
  expect(ranked(adjective("شكر", "شُكْر")).map(([, rank]) => rank)).toEqual([500, 20]);
});

test("a particle keeps its canonical form", () => {
  const particle: WiktionaryEntry = {
    word: "من",
    pos: "prep",
    senses: [{ glosses: ["from"] }],
    forms: [
      { form: "مِنْ", tags: ["canonical"] },
      { form: "min", tags: ["romanization"] },
    ],
  };
  expect(extract([particle])).toEqual([{ word: "مِنْ", rank: 2 }]);
});

test("an entry with no ordinary sense gives nothing", () => {
  for (const tag of ["obsolete", "archaic", "rare", "dated", "dialectal", "vulgar", "offensive", "slang", "form-of"]) {
    expect(words([noun("كتاب", "كِتَاب", [{ glosses: ["thing"], tags: [tag] }])]), tag).toEqual([]);
  }
  expect(words([noun("كتاب", "كِتَاب", [{ tags: ["no-gloss"] }])])).toEqual([]);
  expect(words([noun("كتاب", "كِتَاب", [{ glosses: ["old"], tags: ["rare"] }, { glosses: ["thing"] }])])).toHaveLength(3);
});

test("proper nouns, other parts of speech and words missing from the frequency list give nothing", () => {
  expect(words([{ ...noun("نوح", "نُوح"), pos: "name" }])).toEqual([]);
  expect(words([{ ...noun("كتاب", "كِتَاب"), pos: "phrase" }])).toEqual([]);
  expect(words([noun("غريبة", "غَرِيبَة")])).toEqual([]);
  expect(words([{ pos: "noun" }, {}])).toEqual([]);
});

test("a form that cannot be typed, is not fully vocalized or is pausal is dropped", () => {
  const entry: WiktionaryEntry = {
    word: "لكن",
    pos: "conj",
    senses: [{ glosses: ["but"] }],
    forms: [
      { form: "لٰكِنَّ", tags: ["canonical"] },
      { form: "لكن # لُكْنَ", tags: ["canonical"] },
      { form: "لَكِن", tags: ["canonical"] },
      { form: "لَكن", tags: ["canonical"] },
      { form: "لَـكِنْ", tags: ["canonical"] },
      { tags: ["canonical"] },
    ],
  };
  expect(words([entry])).toEqual([]);
});

test("a vowel written before its shadda comes out shadda first", () => {
  const entry: WiktionaryEntry = {
    word: "مد",
    pos: "verb",
    senses: [{ glosses: ["to extend"] }],
    forms: [
      { form: VOWEL_FIRST_MADDA, tags: ["active", "indicative", "masculine", "past", "singular", "third-person"] },
      { form: "يَمُدُّ", tags: ["active", "indicative", "masculine", "non-past", "singular", "third-person"] },
    ],
  };
  expect(words([entry])[0]).toBe(SHADDA_FIRST_MADDA);
  expect(words([entry])).toHaveLength(2);
});

test("a form that carries the definite article is dropped", () => {
  const relative: WiktionaryEntry = {
    word: "من",
    pos: "pron",
    senses: [{ glosses: ["who"] }],
    forms: [
      { form: "اَلَّذِي", tags: ["canonical"] },
      { form: "اَلْمَنُّ", tags: ["canonical"] },
      { form: "اِلْتَهَمَ", tags: ["canonical"] },
    ],
  };
  expect(words([relative])).toEqual(["اِلْتَهَمَ"]);
});

test("one entry gives at most six forms, and the same word from two entries is listed once", () => {
  const adjective = noun("كتاب", "كِتَاب");
  const many: WiktionaryEntry = {
    ...adjective,
    forms: [
      ...(adjective.forms ?? []).filter((form) => form.tags?.includes("plural")),
      ...["كَتَ", "كُتَ", "كِتَ", "كَتَّ", "كُتَّ", "كِتَّ"].flatMap((start) => [
        { form: `${start}ابٌ`, tags: ["indefinite", "nominative", "singular"] },
        { form: `${start}ابٍ`, tags: ["genitive", "indefinite", "singular"] },
      ]),
    ],
  };
  expect(words([many])).toHaveLength(6);
  expect(words([noun("كتاب", "كِتَاب"), noun("كتاب", "كِتَاب")])).toHaveLength(3);
});

test("the blocklist removes a spelling in every vocalization, the reject list one exact word", () => {
  const rules: Rules = { blocklist: new Set(["رب", "قرآن", "نوح"]), reject: new Set(["كِتَابًا"]), limit: 100 };
  const entries = [noun("رب", "رَبّ"), noun("رب", "رُبّ"), noun("قرآن", "قُرْآن"), noun("نوح", "نَوْح"), noun("كتاب", "كِتَاب")];
  expect(words(entries, rules)).toEqual(["كِتَابٌ", "كِتَابٍ"]);
  expect(words(entries)).toHaveLength(15);
});

test("words come out by rank, then by spelling, and the limit never splits the words of one spelling", () => {
  const entries = [noun("كتاب", "كِتَاب"), noun("رب", "رَبّ"), noun("رب", "رُبّ")];
  expect(extract(entries).map((row) => row.rank)).toEqual([10, 10, 10, 40, 40, 40, 40, 40, 40]);
  expect(words(entries, { ...OPEN, limit: 8 })).toHaveLength(3);
  expect(words(entries, { ...OPEN, limit: 9 })).toHaveLength(9);
  expect(words(entries, { ...OPEN, limit: 2 })).toEqual([]);
});

test("where a spelling is also a function word, only the function word is kept", () => {
  const preposition: WiktionaryEntry = {
    word: "من",
    pos: "prep",
    senses: [{ glosses: ["from"] }],
    forms: [{ form: "مِنْ", tags: ["canonical"] }],
  };
  const unusable: WiktionaryEntry = { ...preposition, word: "كتاب", forms: [{ form: "كتاب", tags: ["canonical"] }] };
  expect(words([noun("من", "مَنّ"), preposition, noun("كتاب", "كِتَاب"), unusable])).toEqual([
    "مِنْ",
    "كِتَابًا",
    "كِتَابٌ",
    "كِتَابٍ",
  ]);
});

test("a function word stays when a noun of the same spelling gives the very same word first", () => {
  const adverb: WiktionaryEntry = {
    word: "كتاب",
    pos: "adv",
    senses: [{ glosses: ["in writing"] }],
    forms: [{ form: "كِتَابًا", tags: ["canonical"] }],
  };
  expect(words([noun("كتاب", "كِتَاب"), adverb])).toEqual(["كِتَابًا"]);
});

test("an entry whose headword is on the blocklist gives nothing, whatever its forms are", () => {
  const rules: Rules = { ...OPEN, blocklist: new Set(["كتاب"]) };
  const irregular: WiktionaryEntry = {
    ...noun("كتاب", "كِتَاب"),
    forms: [{ form: "كُتُبٌ", tags: ["indefinite", "nominative", "singular"] }],
  };
  expect(words([irregular])).toEqual(["كُتُبٌ"]);
  expect(words([irregular], rules)).toEqual([]);
});

test("a removed candidate says which list removed it", () => {
  const rules: Rules = { blocklist: new Set(["رب"]), reject: new Set(["كِتَابٌ"]), limit: 100 };
  const candidates = [noun("رب", "رَبّ"), noun("كتاب", "كِتَاب")].flatMap((entry) => wordsOf(entry, RANKS));
  expect(candidates.map((candidate) => candidate.word).slice(3)).toEqual(["كِتَابٌ", "كِتَابًا", "كِتَابٍ"]);
  expect(candidates.map((candidate) => removalOf(candidate, rules))).toEqual([
    "blocklist",
    "blocklist",
    "blocklist",
    "reject",
    undefined,
    undefined,
  ]);
});

test("a word of a single letter is left out", () => {
  const oath: WiktionaryEntry = {
    word: "من",
    pos: "particle",
    senses: [{ glosses: ["by"] }],
    forms: [
      { form: "تَ", tags: ["canonical"] },
      { form: "مِنْ", tags: ["canonical"] },
    ],
  };
  expect(words([oath])).toEqual(["مِنْ"]);
});

test("a list file holds one entry per line; blank lines and headings are skipped", () => {
  expect(parseList("# Names\nرب\n\n  قرآن  \n# Other\n\nنوح\n")).toEqual(new Set(["رب", "قرآن", "نوح"]));
  expect(parseList("")).toEqual(new Set());
});

test("a rejected word written vowel first still removes the word, which is stored shadda first", () => {
  const verb: WiktionaryEntry = {
    word: "مد",
    pos: "verb",
    senses: [{ glosses: ["to extend"] }],
    forms: [
      { form: VOWEL_FIRST_MADDA, tags: ["active", "indicative", "masculine", "past", "singular", "third-person"] },
      { form: "يَمُدُّ", tags: ["active", "indicative", "masculine", "non-past", "singular", "third-person"] },
    ],
  };
  expect(words([verb])).toContain(SHADDA_FIRST_MADDA);
  const left = words([verb], { ...OPEN, reject: parseList(VOWEL_FIRST_MADDA) });
  expect(left).toHaveLength(1);
  expect(left).not.toContain(SHADDA_FIRST_MADDA);
});

test("a clean word list has no violations", () => {
  expect(violationsOf(extract([noun("كتاب", "كِتَاب")]), OPEN)).toEqual([]);
});

test("each broken rule of the committed list is reported", () => {
  const good = { word: "كِتَابٌ", rank: 10 };
  const report = (rows: Parameters<typeof violationsOf>[0], rules: Rules = OPEN) =>
    violationsOf(rows, rules).join("\n");
  expect(report([{ ...good, word: "كِتَاب" }])).toMatch(/not fully vocalized/);
  expect(report([{ ...good, word: "كتاب" }])).toMatch(/not fully vocalized/);
  expect(report([{ ...good, word: "رَبُّٰ" }])).toMatch(/cannot be typed/);
  expect(report([{ ...good, word: VOWEL_FIRST_MADDA }])).toMatch(/shadda/);
  expect(report([{ ...good, word: SHADDA_FIRST_MADDA }])).toBe("");
  expect(report([{ ...good, word: "اَلْكِتَابُ" }])).toMatch(/definite article/);
  expect(report([good], { ...OPEN, blocklist: new Set(["رَبّ"]) })).toMatch(/blocklist entry .* is vocalized/);
  expect(report([good, good])).toMatch(/listed twice/);
  expect(report([good], { ...OPEN, blocklist: new Set(["كتاب"]) })).toMatch(/blocklist/);
  expect(report([good], { ...OPEN, reject: new Set(["كِتَابٌ"]) })).toMatch(/reject/);
  expect(report([{ ...good, rank: 0 }])).toMatch(/rank/);
  expect(report([good, { ...good, word: "كِتَابٍ", rank: 3 }])).toMatch(/order/);
  expect(report([good], { ...OPEN, limit: 0 })).toMatch(/more than 0 words/);
});

test("coverage counts what the starter letters can spell and how often each letter and mark is met", () => {
  const rows = ["مِنْ", "مَنْ", "كِتَابًا", "كِتَابٌ", "بَيْتٌ", "دَرْسٌ"].map((word, index) => ({ word, rank: index + 1 }));
  const coverage = coverageOf(rows, ["م", "ن", "ك", "ت", "ا", "ب", "ي"]);
  expect(coverage.starterWords).toBe(5);
  expect(coverage.starterSpellings).toBe(4);
  expect(coverage.wordsPerStarterLetter.get("م")).toBe(2);
  expect(coverage.wordsPerStarterLetter.get("ب")).toBe(3);
  expect(coverage.wordsPerStarterLetter.get("ي")).toBe(1);
  expect(coverage.wordsPerMark.get("\u0652")).toBe(4);
  expect(coverage.wordsPerMark.get("\u064C")).toBe(3);
  expect(coverage.wordsPerMark.get("\u064D")).toBe(0);
  expect(coverage.wordsWithoutMarks).toBe(0);
});

test("the committed blocklist holds the sacred words it exists for, and they are removed in every vocalization", () => {
  const committed = parseList(readFileSync(new URL("../../data/practice/blocklist.txt", import.meta.url), "utf8"));
  const sacred = ["الله", "رب", "قرآن", "آية", "سورة", "نبي", "رسول", "نوح", "محمد", "ملاك"];
  expect(sacred.filter((spelling) => !committed.has(spelling))).toEqual([]);
  const rules: Rules = { blocklist: committed, reject: new Set(), limit: 100 };
  expect(words([noun("رب", "رَبّ"), noun("رب", "رُبّ"), noun("قرآن", "قُرْآن"), noun("نوح", "نَوْح")], rules)).toEqual([]);
});
