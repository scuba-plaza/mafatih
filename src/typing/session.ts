import { isMark } from "~/text/arabic.ts";
import type { Prompt, Unit } from "~/text/prompt.ts";

export type Key = { readonly kind: "char"; readonly char: string } | { readonly kind: "backspace" };

export interface Sample {
  readonly expected: string;
  readonly correct: boolean;
  readonly latencyMs: number | null;
}

export interface SessionOptions {
  readonly requireBackspace: boolean;
}

export interface Session {
  readonly prompt: Prompt;
  readonly units: readonly Unit[];
  readonly origin: number;
  readonly cursor: number;
  readonly mistakes: readonly string[];
  readonly missed: boolean;
  readonly errors: number;
  readonly samples: readonly Sample[];
  readonly startedAt: number | null;
  readonly finishedAt: number | null;
  readonly lastError: { readonly at: number; readonly char: string } | null;
  readonly activeMs: number;
  readonly lastKeyAt: number | null;
  readonly lastCorrectAt: number | null;
}

export interface Metrics {
  readonly elapsedMs: number;
  readonly typedChars: number;
  readonly cpm: number;
  readonly wpm: number;
  readonly accuracy: number;
  readonly errors: number;
}

export const LATENCY_CAP_MS = 3000;
export const MAX_PENDING_MISTAKES = 10;

const CHARS_PER_WORD = 5;

export function createSession(prompt: Prompt, origin = 0): Session {
  const start = Math.max(0, Math.min(Math.trunc(origin), prompt.units.length));
  return {
    prompt,
    units: prompt.units,
    origin: start,
    cursor: start,
    mistakes: [],
    missed: false,
    errors: 0,
    samples: [],
    startedAt: null,
    finishedAt: null,
    lastError: null,
    activeMs: 0,
    lastKeyAt: null,
    lastCorrectAt: null,
  };
}

export function isComplete(session: Session): boolean {
  return session.cursor >= session.units.length;
}

export function expectedText(session: Session): string | undefined {
  return session.units[session.cursor]?.text;
}

export function view(session: Session): { doneUntil: number; mistakes: string } {
  return {
    doneUntil: session.units[session.cursor]?.start ?? session.prompt.shown.length,
    mistakes: session.mistakes.join(""),
  };
}

function activeSince(session: Session, at: number): number {
  return session.lastKeyAt === null ? 0 : Math.min(Math.max(0, at - session.lastKeyAt), LATENCY_CAP_MS);
}

function touched(session: Session, at: number): Session {
  return {
    ...session,
    startedAt: session.startedAt ?? at,
    activeMs: session.activeMs + activeSince(session, at),
    lastKeyAt: at,
  };
}

export function pause(session: Session, at: number): Session {
  if (session.lastKeyAt === null) {
    return session;
  }
  return { ...session, activeMs: session.activeMs + activeSince(session, at), lastKeyAt: null, lastCorrectAt: null };
}

function latencyAt(session: Session, at: number): number | null {
  if (session.lastCorrectAt === null) {
    return null;
  }
  const gap = at - session.lastCorrectAt;
  return gap > 0 && gap <= LATENCY_CAP_MS ? gap : null;
}

function advance(session: Session, unit: Unit, at: number): Session {
  const cursor = session.cursor + 1;
  const sample: Sample = { expected: unit.text, correct: true, latencyMs: latencyAt(session, at) };
  return {
    ...session,
    cursor,
    missed: false,
    samples: session.missed ? session.samples : [...session.samples, sample],
    lastCorrectAt: at,
    finishedAt: cursor >= session.units.length ? at : null,
  };
}

function wrong(session: Session, unit: Unit, char: string, at: number, options: SessionOptions): Session {
  const miss: Sample = { expected: unit.text, correct: false, latencyMs: null };
  const shown = options.requireBackspace && session.mistakes.length < MAX_PENDING_MISTAKES;
  return {
    ...session,
    missed: true,
    errors: session.errors + 1,
    samples: session.missed ? session.samples : [...session.samples, miss],
    mistakes: shown ? [...session.mistakes, char] : session.mistakes,
    lastError: { at, char },
  };
}

function withUnits(session: Session, replaced: number, units: readonly Unit[]): Session {
  return {
    ...session,
    units: [...session.units.slice(0, session.cursor), ...units, ...session.units.slice(session.cursor + replaced)],
  };
}

function splitLamAlef(session: Session, unit: Unit): Session {
  const [lam = "", alef = ""] = [...unit.text];
  return withUnits(session, 1, [
    { text: lam, start: unit.start, end: unit.start + lam.length },
    { text: alef, start: unit.end - alef.length, end: unit.end },
  ]);
}

function laterMarkOfSameLetter(session: Session, char: string): number {
  for (let index = session.cursor + 1; index < session.units.length; index += 1) {
    const unit = session.units[index];
    const before = session.units[index - 1];
    if (unit === undefined || before === undefined || !isMark(unit.text) || unit.start !== before.end) {
      return -1;
    }
    if (unit.text === char) {
      return index;
    }
  }
  return -1;
}

function swapMarks(session: Session, unit: Unit, laterIndex: number): Session {
  const later = session.units[laterIndex];
  if (later === undefined) {
    return session;
  }
  const units = [...session.units];
  units[session.cursor] = { ...unit, text: later.text };
  units[laterIndex] = { ...later, text: unit.text };
  return { ...session, units };
}

function untimed(session: Session): Session {
  return { ...session, lastCorrectAt: null };
}

function typeChar(session: Session, char: string, at: number, options: SessionOptions): Session {
  const unit = session.units[session.cursor];
  if (unit === undefined) {
    return session;
  }
  if (session.mistakes.length > 0) {
    return wrong(session, unit, char, at, options);
  }
  if (char === unit.text) {
    return advance(session, unit, at);
  }
  const [first = "", ...rest] = [...char];
  if (rest.length > 0) {
    let state = typeChar(session, first, at, options);
    for (const next of rest) {
      state = typeChar(untimed(state), next, at, options);
    }
    return state;
  }
  if ([...unit.text].length > 1 && unit.text.startsWith(char)) {
    return typeChar(splitLamAlef(session, unit), char, at, options);
  }
  const laterIndex = isMark(unit.text) && isMark(char) ? laterMarkOfSameLetter(session, char) : -1;
  if (laterIndex >= 0) {
    return typeChar(swapMarks(session, unit, laterIndex), char, at, options);
  }
  return wrong(session, unit, char, at, options);
}

export function applyKey(session: Session, key: Key, at: number, options: SessionOptions): Session {
  if (isComplete(session)) {
    return session;
  }
  const active = touched(session, at);
  if (key.kind === "backspace") {
    return { ...active, mistakes: active.mistakes.slice(0, -1) };
  }
  return typeChar(active, key.char, at, options);
}

export function metricsOf(session: Session, now?: number): Metrics {
  const live = now === undefined || isComplete(session) ? 0 : activeSince(session, now);
  const elapsedMs = session.activeMs + live;
  const typedChars = session.units
    .slice(session.origin, session.cursor)
    .reduce((count, unit) => count + [...unit.text].length, 0);
  const cpm = elapsedMs > 0 ? typedChars / (elapsedMs / 60_000) : 0;
  const firstTry = session.samples.filter((sample) => sample.correct).length;
  return {
    elapsedMs,
    typedChars,
    cpm,
    wpm: cpm / CHARS_PER_WORD,
    accuracy: session.samples.length === 0 ? 1 : firstTry / session.samples.length,
    errors: session.errors,
  };
}
