export const PAUSE_MS = 3000;

export interface CharAttempt {
  char: string;
  correct: boolean;
  latency: number | null;
}

export interface TypingState {
  target: string;
  typed: string;
  wrong: string | null;
  startedAt: number | null;
  lastAt: number | null;
  attempts: CharAttempt[];
  done: boolean;
}

export function beginTyping(target: string): TypingState {
  return {
    target,
    typed: "",
    wrong: null,
    startedAt: null,
    lastAt: null,
    attempts: [],
    done: false,
  };
}

export function applyKey(state: TypingState, char: string, now: number): TypingState {
  if (state.done) {
    return state;
  }
  if (char === "\b") {
    return state.wrong === null ? state : { ...state, wrong: null };
  }
  if (state.wrong !== null) {
    return { ...state, attempts: [...state.attempts, { char, correct: false, latency: null }] };
  }
  const expected = state.target[state.typed.length];
  if (expected === undefined) {
    return state;
  }
  const startedAt = state.startedAt ?? now;
  const gap = state.lastAt === null ? null : now - state.lastAt;
  const latency = gap !== null && gap <= PAUSE_MS ? gap : null;
  const next: TypingState = {
    ...state,
    startedAt,
    lastAt: now,
    attempts: [...state.attempts, { char, correct: char === expected, latency }],
  };
  if (char === expected) {
    const typed = state.typed + char;
    return { ...next, typed, wrong: null, done: typed === state.target };
  }
  return { ...next, wrong: char };
}

export function accuracyOf(state: TypingState): number {
  if (state.attempts.length === 0) {
    return 1;
  }
  const correct = state.attempts.filter((attempt) => attempt.correct).length;
  return correct / state.attempts.length;
}

export function elapsedOf(state: TypingState, now: number): number {
  if (state.startedAt === null || state.attempts.length === 0) {
    return 0;
  }
  const end = state.done ? (state.lastAt ?? now) : now;
  return Math.max(0, end - state.startedAt);
}
