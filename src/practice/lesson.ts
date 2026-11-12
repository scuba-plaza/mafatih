import { skeleton } from "~/text/arabic.ts";
import { buildPrompt, type Prompt } from "~/text/prompt.ts";
import { requiredMarks, type Vocalization } from "~/text/vocalization.ts";
import { focusRung, type LadderProgress, unlockedLetters, unlockedMarks } from "./ladder.ts";
import type { PracticeWord } from "./words.ts";

export interface PracticeOptions {
  readonly words: readonly PracticeWord[];
  readonly progress: LadderProgress;
  readonly vocalization: Vocalization;
  readonly seed: number;
}

interface Choice {
  readonly word: string;
  readonly weight: number;
  readonly drillsFocus: boolean;
}

export const LESSON_CHARS = 38;

const FOCUS_SHARE = 0.5;
const MAX_REPEATS = 2;
const SEED_STEP = 0x6d2b79f5;
const UINT32_RANGE = 2 ** 32;

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + SEED_STEP) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

const spellingsByList = new WeakMap<readonly PracticeWord[], readonly string[]>();

function spellingsOf(words: readonly PracticeWord[]): readonly string[] {
  const known = spellingsByList.get(words) ?? words.map((entry) => skeleton(entry.word));
  spellingsByList.set(words, known);
  return known;
}

function choicesFor(words: readonly PracticeWord[], progress: LadderProgress): Choice[] {
  const letters = unlockedLetters(progress);
  const focus = focusRung(progress)?.char;
  const spellings = spellingsOf(words);
  const rarest = words.reduce((highest, entry) => Math.max(highest, entry.rank), 1);
  const readings = new Map<string, number>();
  const usable: { readonly entry: PracticeWord; readonly spelling: string }[] = [];
  words.forEach((entry, index) => {
    const spelling = spellings[index] ?? "";
    if ([...spelling].every((letter) => letters.has(letter))) {
      usable.push({ entry, spelling });
      readings.set(spelling, (readings.get(spelling) ?? 0) + 1);
    }
  });
  return usable.map(({ entry, spelling }) => ({
    word: entry.word,
    weight: (1 + Math.log(1 + rarest / entry.rank)) / (readings.get(spelling) ?? 1),
    drillsFocus: focus !== undefined && entry.word.includes(focus),
  }));
}

function pick(choices: readonly Choice[], random: () => number): Choice | undefined {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0);
  let remaining = random() * total;
  for (const choice of choices) {
    remaining -= choice.weight;
    if (remaining < 0) {
      return choice;
    }
  }
  return choices.at(-1);
}

export function buildPracticeLesson(options: PracticeOptions): Prompt {
  const { words, progress, vocalization, seed } = options;
  const required = requiredMarks(vocalization, unlockedMarks(progress));
  const random = createRandom(seed);
  const choices = choicesFor(words, progress);
  const chosen: string[] = [];
  const times = new Map<string, number>();
  let typed = 0;
  while (typed < LESSON_CHARS) {
    const allowed = choices.filter(({ word }) => word !== chosen.at(-1) && (times.get(word) ?? 0) < MAX_REPEATS);
    const drills = random() < FOCUS_SHARE ? allowed.filter((choice) => choice.drillsFocus) : [];
    const next = pick(drills.length > 0 ? drills : allowed, random);
    if (next === undefined) {
      break;
    }
    typed += buildPrompt(next.word, required).units.length + (chosen.length > 0 ? 1 : 0);
    times.set(next.word, (times.get(next.word) ?? 0) + 1);
    chosen.push(next.word);
  }
  return buildPrompt(chosen.join(" "), required);
}
