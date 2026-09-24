import { expandLigature, LIGATURE_SEQUENCES } from "~/engine/layout/ligatures.ts";

export type Outcome = "pending" | "correct" | "corrected";

export interface KeystrokeRecord {
  expected: string;
  typed: string;
  correct: boolean;
  latencyMs: number;
  at: number;
}

export interface SessionState {
  chars: readonly string[];
  cursor: number;
  outcomes: readonly Outcome[];
  errors: number;
  keystrokes: number;
  startedAt: number | null;
  finishedAt: number | null;
  lastAcceptedAt: number | null;
  errorAt: number | null;
  records: readonly KeystrokeRecord[];
}

export interface SessionMetrics {
  elapsedMs: number;
  typedChars: number;
  cpm: number;
  wpm: number;
  accuracy: number;
  errors: number;
}

export function createSession(text: string): SessionState {
  const chars = [...text];
  return {
    chars,
    cursor: 0,
    outcomes: chars.map(() => "pending" as Outcome),
    errors: 0,
    keystrokes: 0,
    startedAt: null,
    finishedAt: null,
    lastAcceptedAt: null,
    errorAt: null,
    records: [],
  };
}

export function isComplete(state: SessionState): boolean {
  return state.finishedAt !== null;
}

export function isTypedKey(key: string): boolean {
  return key === "Backspace" || [...key].length === 1 || LIGATURE_SEQUENCES.has(key);
}

function applyChar(state: SessionState, typed: string, at: number): SessionState {
  if (isComplete(state)) {
    return state;
  }
  const expected = state.chars[state.cursor];
  if (expected === undefined) {
    return state;
  }

  const startedAt = state.startedAt ?? at;
  const reference = state.lastAcceptedAt ?? startedAt;
  const latencyMs = Math.max(0, at - reference);
  const correct = typed === expected;

  const record: KeystrokeRecord = { expected, typed, correct, latencyMs, at };
  const records = [...state.records, record];
  const keystrokes = state.keystrokes + 1;

  if (!correct) {
    return { ...state, startedAt, keystrokes, errors: state.errors + 1, errorAt: state.cursor, records };
  }

  const outcomes = [...state.outcomes];
  outcomes[state.cursor] = state.errorAt === state.cursor ? "corrected" : "correct";
  const cursor = state.cursor + 1;
  const finishedAt = cursor >= state.chars.length ? at : null;

  return {
    ...state,
    startedAt,
    keystrokes,
    outcomes,
    cursor,
    errorAt: null,
    lastAcceptedAt: at,
    finishedAt,
    records,
  };
}

export function applyKey(state: SessionState, key: string, at: number): SessionState {
  if (isComplete(state)) {
    return state;
  }
  if (key === "Backspace") {
    return state.errorAt === null ? state : { ...state, errorAt: null };
  }
  if (!isTypedKey(key)) {
    return state;
  }

  let next = state;
  for (const char of expandLigature(key)) {
    next = applyChar(next, char, at);
  }
  return next;
}

export function expectedChar(state: SessionState): string | undefined {
  return state.chars[state.cursor];
}

export function metrics(state: SessionState, now?: number): SessionMetrics {
  const end = state.finishedAt ?? now ?? state.lastAcceptedAt ?? state.startedAt ?? 0;
  const start = state.startedAt ?? end;
  const elapsedMs = Math.max(0, end - start);
  const typedChars = state.cursor;
  const minutes = elapsedMs / 60000;
  const cpm = minutes > 0 ? typedChars / minutes : 0;
  const correctStrokes = state.keystrokes - state.errors;
  const accuracy = state.keystrokes === 0 ? 0 : correctStrokes / state.keystrokes;
  return { elapsedMs, typedChars, cpm, wpm: cpm / 5, accuracy, errors: state.errors };
}
