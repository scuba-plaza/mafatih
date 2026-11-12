import type { MessageKey } from "~/i18n/en.ts";

export interface SourceLink {
  readonly name: string;
  readonly href: string;
}

export interface Credit {
  readonly label: MessageKey;
  readonly note: MessageKey;
  readonly links: readonly SourceLink[];
}

export const WORD_LIST_DATE = Date.UTC(2026, 9, 30);

export const CREDITS: readonly Credit[] = [
  {
    label: "about.quranLabel",
    note: "about.quranNote",
    links: [{ name: "Tanzil Project", href: "https://tanzil.net" }],
  },
  { label: "about.audioLabel", note: "about.audioNote", links: [{ name: "EveryAyah", href: "https://everyayah.com" }] },
  {
    label: "about.wordsLabel",
    note: "about.wordsNote",
    links: [
      { name: "Wiktionary via kaikki.org", href: "https://kaikki.org/dictionary/Arabic/" },
      { name: "FrequencyWords", href: "https://github.com/hermitdave/FrequencyWords" },
    ],
  },
  {
    label: "about.fontsLabel",
    note: "about.fontsNote",
    links: [{ name: "Fontsource", href: "https://fontsource.org" }],
  },
  {
    label: "about.layoutLabel",
    note: "about.layoutNote",
    links: [
      {
        name: "Microsoft Arabic (101) keyboard",
        href: "https://learn.microsoft.com/en-us/globalization/keyboards/kbda1",
      },
    ],
  },
  {
    label: "about.codeLabel",
    note: "about.codeNote",
    links: [{ name: "Source code on GitHub", href: "https://github.com/scuba-plaza/mafatih" }],
  },
];
