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
  readonly within: number;
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

export interface SessionView {
  readonly doneUntil: number;
  readonly mistakes: string;
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
  const start = Number.isFinite(origin) ? Math.max(0, Math.min(Math.trunc(origin), prompt.units.length)) : 0;
  return {
    prompt,
    units: prompt.units,
    origin: start,
    cursor: start,
    within: 0,
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
  return session.units[session.cursor]?.text.slice(session.within);
}

export function view(session: Session): SessionView {
  const unit = session.units[session.cursor];
  const remaining = unit === undefined ? 0 : unit.text.length - session.within;
  const doneUntil =
    unit === undefined ? session.prompt.shown.length : session.within > 0 ? unit.end - remaining : unit.start;
  return { doneUntil, mistakes: session.mistakes.join("") };
}

function timeOf(session: Session, at: number): number {
  const latest = session.lastKeyAt ?? 0;
  return Number.isFinite(at) ? Math.max(at, latest) : latest;
}

function activeSince(session: Session, time: number): number {
  return session.lastKeyAt === null ? 0 : Math.min(Math.max(0, time - session.lastKeyAt), LATENCY_CAP_MS);
}

function touched(session: Session, time: number): Session {
  return {
    ...session,
    startedAt: session.startedAt ?? time,
    activeMs: session.activeMs + activeSince(session, time),
    lastKeyAt: time,
  };
}

export function pause(session: Session, at: number): Session {
  if (session.lastKeyAt === null || isComplete(session)) {
    return session;
  }
  const time = timeOf(session, at);
  return { ...session, activeMs: session.activeMs + activeSince(session, time), lastKeyAt: null, lastCorrectAt: null };
}

function latencyAt(session: Session, time: number): number | null {
  if (session.lastCorrectAt === null) {
    return null;
  }
  const gap = time - session.lastCorrectAt;
  return gap > 0 && gap <= LATENCY_CAP_MS ? gap : null;
}

function accept(session: Session, unit: Unit, typed: string, time: number): Session {
  const within = session.within + typed.length;
  const finishesUnit = within >= unit.text.length;
  const cursor = finishesUnit ? session.cursor + 1 : session.cursor;
  const sample: Sample = session.missed
    ? { expected: typed, correct: false, latencyMs: null }
    : { expected: typed, correct: true, latencyMs: latencyAt(session, time) };
  return {
    ...session,
    cursor,
    within: finishesUnit ? 0 : within,
    missed: false,
    samples: [...session.samples.slice(0, session.missed ? -1 : undefined), sample],
    lastCorrectAt: time,
    finishedAt: cursor >= session.units.length ? time : null,
  };
}

function reject(session: Session, expected: string, char: string, time: number, options: SessionOptions): Session {
  const miss: Sample = { expected, correct: false, latencyMs: null };
  const shown = options.requireBackspace && session.mistakes.length < MAX_PENDING_MISTAKES;
  return {
    ...session,
    missed: true,
    errors: session.errors + 1,
    samples: session.missed ? session.samples : [...session.samples, miss],
    mistakes: shown ? [...session.mistakes, char] : session.mistakes,
    lastError: { at: time, char },
  };
}

function withLaterMarkBroughtForward(session: Session, unit: Unit, mark: string): Session | undefined {
  for (let index = session.cursor + 1; index < session.units.length; index += 1) {
    const later = session.units[index];
    if (later === undefined || !isMark(later.text) || later.start !== session.units[index - 1]?.end) {
      return undefined;
    }
    if (later.text === mark) {
      const units = [...session.units];
      units[session.cursor] = { ...unit, text: mark };
      units[index] = { ...later, text: unit.text };
      return { ...session, units };
    }
  }
  return undefined;
}

function typeChar(session: Session, char: string, time: number, options: SessionOptions): Session {
  const unit = session.units[session.cursor];
  if (unit === undefined) {
    return session;
  }
  const expected = unit.text.slice(session.within);
  if (session.mistakes.length > 0) {
    return reject(session, expected, char, time, options);
  }
  if (expected.startsWith(char)) {
    return accept(session, unit, char, time);
  }
  const reordered = isMark(expected) && isMark(char) ? withLaterMarkBroughtForward(session, unit, char) : undefined;
  return reordered === undefined ? reject(session, expected, char, time, options) : accept(reordered, unit, char, time);
}

function untimed(session: Session): Session {
  return { ...session, lastCorrectAt: null };
}

function typeKey(session: Session, text: string, time: number, options: SessionOptions): Session {
  if (session.mistakes.length === 0 && text === expectedText(session)) {
    return typeChar(session, text, time, options);
  }
  const [first = "", ...rest] = [...text];
  let state = typeChar(session, first, time, options);
  for (const char of rest) {
    state = typeChar(untimed(state), char, time, options);
  }
  return state;
}

export function applyKey(session: Session, key: Key, at: number, options: SessionOptions): Session {
  if (isComplete(session) || (key.kind === "char" && key.char === "")) {
    return session;
  }
  const visible = options.requireBackspace || session.mistakes.length === 0 ? session : { ...session, mistakes: [] };
  if (key.kind === "backspace" && visible.mistakes.length === 0) {
    return visible;
  }
  const time = timeOf(visible, at);
  const active = touched(visible, time);
  return key.kind === "backspace"
    ? { ...active, mistakes: active.mistakes.slice(0, -1) }
    : typeKey(active, key.char, time, options);
}

export function metricsOf(session: Session, now?: number): Metrics {
  const live = now === undefined || isComplete(session) ? 0 : activeSince(session, timeOf(session, now));
  const elapsedMs = session.activeMs + live;
  const typedChars = session.units
    .slice(session.origin, session.cursor)
    .reduce((count, unit) => count + unit.text.length, session.within);
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
