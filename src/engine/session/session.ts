import { LIGATURE_KEYS } from "~/engine/layout/ara.ts";
import { expandLigature, LIGATURE_SEQUENCES } from "~/engine/layout/ligatures.ts";
import { LATENCY_CAP_MS } from "~/engine/stats/keystats.ts";

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
  idleMs: number;
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
    idleMs: 0,
  };
}

export function isComplete(state: SessionState): boolean {
  return state.finishedAt !== null;
}

export function isTypedKey(key: string): boolean {
  return key === "Backspace" || [...key].length === 1 || LIGATURE_SEQUENCES.has(key);
}

export function ligatureAt(chars: readonly string[], index: number): string | undefined {
  return LIGATURE_KEYS.get(`${chars[index] ?? ""}${chars[index + 1] ?? ""}`);
}

export function expectedKey(state: SessionState): string | undefined {
  return ligatureAt(state.chars, state.cursor) ?? state.chars[state.cursor];
}

function lastKeyAt(state: SessionState, fallback: number): number {
  return state.records[state.records.length - 1]?.at ?? fallback;
}

function strike(state: SessionState, expected: string, typed: string, width: number, at: number): SessionState {
  const startedAt = state.startedAt ?? at;
  const reference = state.lastAcceptedAt ?? startedAt;
  const latencyMs = Math.max(0, at - reference);
  const correct = width > 0;
  const idleMs = state.idleMs + Math.max(0, at - lastKeyAt(state, startedAt) - LATENCY_CAP_MS);

  const record: KeystrokeRecord = { expected, typed, correct, latencyMs, at };
  const records = [...state.records, record];
  const keystrokes = state.keystrokes + 1;

  if (!correct) {
    return { ...state, startedAt, keystrokes, errors: state.errors + 1, errorAt: state.cursor, records, idleMs };
  }

  const outcomes = [...state.outcomes];
  const outcome: Outcome = state.errorAt === state.cursor ? "corrected" : "correct";
  for (let i = state.cursor; i < state.cursor + width; i += 1) {
    outcomes[i] = outcome;
  }
  const cursor = state.cursor + width;
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
    idleMs,
  };
}

function applyChar(state: SessionState, typed: string, at: number): SessionState {
  const expected = state.chars[state.cursor];
  if (isComplete(state) || expected === undefined) {
    return state;
  }
  if (typed === expected) {
    return strike(state, expected, typed, 1, at);
  }
  return strike(state, ligatureAt(state.chars, state.cursor) ?? expected, typed, 0, at);
}

function applyLigature(state: SessionState, key: string, sequence: string, at: number): SessionState | undefined {
  const expected = ligatureAt(state.chars, state.cursor);
  if (expected === undefined) {
    return undefined;
  }
  const width = expandLigature(expected) === sequence ? [...sequence].length : 0;
  return strike(state, expected, key, width, at);
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

  const sequence = expandLigature(key);
  if (LIGATURE_SEQUENCES.has(sequence)) {
    const struck = applyLigature(state, key, sequence, at);
    if (struck !== undefined) {
      return struck;
    }
  }
  let next = state;
  for (const char of sequence) {
    next = applyChar(next, char, at);
  }
  return next;
}

export function expectedChar(state: SessionState): string | undefined {
  return state.chars[state.cursor];
}

export function metrics(state: SessionState, now?: number): SessionMetrics {
  const live =
    now === undefined || state.startedAt === null
      ? now
      : Math.min(now, lastKeyAt(state, state.startedAt) + LATENCY_CAP_MS);
  const end = state.finishedAt ?? live ?? state.lastAcceptedAt ?? state.startedAt ?? 0;
  const start = state.startedAt ?? end;
  const elapsedMs = Math.max(0, end - start - state.idleMs);
  const typedChars = state.cursor;
  const minutes = elapsedMs / 60000;
  const cpm = minutes > 0 ? typedChars / minutes : 0;
  const correctStrokes = state.keystrokes - state.errors;
  const accuracy = state.keystrokes === 0 ? 0 : correctStrokes / state.keystrokes;
  return { elapsedMs, typedChars, cpm, wpm: cpm / 5, accuracy, errors: state.errors };
}
