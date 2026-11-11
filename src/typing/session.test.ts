import { expect, test } from "vitest";
import { FATHA, SHADDA } from "~/text/arabic.ts";
import { buildPrompt } from "~/text/prompt.ts";
import {
  applyKey,
  createSession,
  expectedText,
  isComplete,
  type Key,
  LATENCY_CAP_MS,
  MAX_PENDING_MISTAKES,
  metricsOf,
  pause,
  type Session,
  type SessionOptions,
  view,
} from "./session.ts";

const LETTERS: ReadonlySet<string> = new Set();
const WITH_MARKS: ReadonlySet<string> = new Set([FATHA, SHADDA]);
const STRICT: SessionOptions = { requireBackspace: true };
const LENIENT: SessionOptions = { requireBackspace: false };
const BACKSPACE: Key = { kind: "backspace" };

function start(shown: string, marks: ReadonlySet<string> = LETTERS, origin?: number): Session {
  return createSession(buildPrompt(shown, marks), origin);
}

function press(session: Session, char: string, at: number, options: SessionOptions = STRICT): Session {
  return applyKey(session, { kind: "char", char }, at, options);
}

function typeAll(session: Session, keys: readonly string[], from: number, step: number, options = STRICT): Session {
  return keys.reduce((state, char, index) => press(state, char, from + index * step, options), session);
}

test("each correct key moves on to the next unit and the last one completes the session", () => {
  let session = start("بت");
  expect(expectedText(session)).toBe("ب");
  session = press(session, "ب", 1000);
  expect(session.cursor).toBe(1);
  expect(isComplete(session)).toBe(false);
  expect(expectedText(session)).toBe("ت");
  session = press(session, "ت", 1200);
  expect(isComplete(session)).toBe(true);
  expect(session.startedAt).toBe(1000);
  expect(session.finishedAt).toBe(1200);
  expect(expectedText(session)).toBeUndefined();
});

test("every unit typed right the first time is one sample, timed from the key before it", () => {
  const session = typeAll(start("بتن"), ["ب", "ت", "ن"], 1000, 250);
  expect(session.samples).toEqual([
    { expected: "ب", correct: true, latencyMs: null },
    { expected: "ت", correct: true, latencyMs: 250 },
    { expected: "ن", correct: true, latencyMs: 250 },
  ]);
  expect(session.errors).toBe(0);
});

test("the done part of the text reaches the next unit, past marks that are shown but not typed", () => {
  let session = start("بَ تَ");
  expect(view(session)).toEqual({ doneUntil: 0, mistakes: "" });
  session = press(session, "ب", 0);
  expect(view(session).doneUntil).toBe(2);
  session = typeAll(session, [" ", "ت"], 100, 100);
  expect(view(session).doneUntil).toBe(5);
});

test("with Backspace required, a wrong key is shown as a mistake and the cursor stays", () => {
  let session = press(start("بت"), "س", 1000);
  expect(session.cursor).toBe(0);
  expect(session.mistakes).toEqual(["س"]);
  expect(view(session)).toEqual({ doneUntil: 0, mistakes: "س" });
  expect(session.lastError).toEqual({ at: 1000, char: "س" });
  session = press(session, "ش", 1100);
  expect(view(session).mistakes).toBe("سش");
});

test("with Backspace required, even the right key is a mistake while earlier mistakes are still there", () => {
  let session = press(start("بت"), "س", 1000);
  session = press(session, "ب", 1100);
  expect(session.cursor).toBe(0);
  expect(session.mistakes).toEqual(["س", "ب"]);
});

test("Backspace removes mistakes one at a time, after which the right key moves on", () => {
  let session = typeAll(start("بت"), ["س", "ش", "ص"], 1000, 100);
  session = applyKey(session, BACKSPACE, 1300, STRICT);
  expect(session.mistakes).toEqual(["س", "ش"]);
  session = applyKey(session, BACKSPACE, 1400, STRICT);
  session = applyKey(session, BACKSPACE, 1500, STRICT);
  expect(session.mistakes).toEqual([]);
  expect(session.cursor).toBe(0);
  session = press(session, "ب", 1600);
  expect(session.cursor).toBe(1);
});

test("a position that was missed is one miss in the samples, however many wrong keys followed", () => {
  let session = typeAll(start("بت"), ["س", "ش", "ص"], 1000, 100);
  expect(session.errors).toBe(3);
  expect(session.samples).toEqual([{ expected: "ب", correct: false, latencyMs: null }]);
  for (const at of [1300, 1400, 1500]) {
    session = applyKey(session, BACKSPACE, at, STRICT);
  }
  session = typeAll(session, ["ب", "ت"], 1600, 200);
  expect(session.samples).toEqual([
    { expected: "ب", correct: false, latencyMs: null },
    { expected: "ت", correct: true, latencyMs: 200 },
  ]);
  expect(session.errors).toBe(3);
});

test("Backspace never deletes text that was typed correctly", () => {
  let session = press(start("بت"), "ب", 1000);
  session = applyKey(session, BACKSPACE, 1100, STRICT);
  expect(session.cursor).toBe(1);
  expect(session.mistakes).toEqual([]);
  expect(session.errors).toBe(0);
});

test("pending mistakes stop piling up at the limit, but further wrong keys still count as errors", () => {
  const wrong = Array.from({ length: MAX_PENDING_MISTAKES + 3 }, () => "س");
  const session = typeAll(start("بت"), wrong, 1000, 50);
  expect(MAX_PENDING_MISTAKES).toBe(10);
  expect(session.mistakes).toHaveLength(10);
  expect(session.errors).toBe(13);
});

test("without Backspace required, a wrong key is counted and flagged but never shown", () => {
  let session = press(start("بت"), "س", 1000, LENIENT);
  expect(session.mistakes).toEqual([]);
  expect(view(session)).toEqual({ doneUntil: 0, mistakes: "" });
  expect(session.errors).toBe(1);
  expect(session.lastError).toEqual({ at: 1000, char: "س" });
  session = press(session, "ش", 1100, LENIENT);
  expect(session.errors).toBe(2);
  expect(session.samples).toEqual([{ expected: "ب", correct: false, latencyMs: null }]);
});

test("without Backspace required, the right key moves on straight after a wrong one and Backspace does nothing", () => {
  let session = press(start("بت"), "س", 1000, LENIENT);
  session = applyKey(session, BACKSPACE, 1050, LENIENT);
  expect(session).toMatchObject({ cursor: 0, errors: 1 });
  session = press(session, "ب", 1100, LENIENT);
  expect(session.cursor).toBe(1);
  session = press(session, "ت", 1300, LENIENT);
  expect(isComplete(session)).toBe(true);
  expect(session.samples).toEqual([
    { expected: "ب", correct: false, latencyMs: null },
    { expected: "ت", correct: true, latencyMs: 200 },
  ]);
});

for (const [mode, options] of [
  ["with", STRICT],
  ["without", LENIENT],
] as const) {
  test(`${mode} Backspace required, the marks of one letter are accepted in either order`, () => {
    const shown = `ب${SHADDA}${FATHA}ت`;
    const shaddaFirst = typeAll(start(shown, WITH_MARKS), ["ب", SHADDA, FATHA, "ت"], 0, 100, options);
    const vowelFirst = typeAll(start(shown, WITH_MARKS), ["ب", FATHA, SHADDA, "ت"], 0, 100, options);
    for (const session of [shaddaFirst, vowelFirst]) {
      expect(isComplete(session)).toBe(true);
      expect(session.errors).toBe(0);
      expect(session.samples.every((sample) => sample.correct)).toBe(true);
    }
    expect(vowelFirst.samples.map((sample) => sample.expected)).toEqual(["ب", FATHA, SHADDA, "ت"]);
  });
}

test("a mark belonging to the next letter is not accepted early", () => {
  const session = typeAll(start(`ب${FATHA}ت${SHADDA}`, WITH_MARKS), ["ب", SHADDA], 0, 100);
  expect(session.cursor).toBe(1);
  expect(session.mistakes).toEqual([SHADDA]);
});

test("the done part of the text still grows mark by mark when they are typed in the other order", () => {
  let session = typeAll(start(`ب${SHADDA}${FATHA}`, WITH_MARKS), ["ب", FATHA], 0, 100);
  expect(view(session).doneUntil).toBe(2);
  session = press(session, SHADDA, 300);
  expect(view(session).doneUntil).toBe(3);
});

test("the lam-alef key types a lam-alef unit in one stroke and one sample", () => {
  const session = typeAll(start("بلا"), ["ب", "لا"], 0, 300);
  expect(isComplete(session)).toBe(true);
  expect(session.samples).toEqual([
    { expected: "ب", correct: true, latencyMs: null },
    { expected: "لا", correct: true, latencyMs: 300 },
  ]);
});

test("a lam-alef unit can also be typed as its two letters, giving two samples", () => {
  let session = typeAll(start("بلَا"), ["ب", "ل"], 0, 300);
  expect(isComplete(session)).toBe(false);
  expect(expectedText(session)).toBe("ا");
  expect(view(session).doneUntil).toBe(3);
  session = press(session, "ا", 700);
  expect(isComplete(session)).toBe(true);
  expect(session.samples.map((sample) => sample.expected)).toEqual(["ب", "ل", "ا"]);
  expect(session.samples.at(-1)).toEqual({ expected: "ا", correct: true, latencyMs: 400 });
});

test("a wrong key where a lam-alef is due is a miss of the lam-alef key", () => {
  const session = press(start("لا"), "ب", 0);
  expect(session.samples).toEqual([{ expected: "لا", correct: false, latencyMs: null }]);
});

test("a lam-alef key pressed where two separate letters are due types them both", () => {
  const session = press(createSession(buildPrompt("لا", LETTERS, [1])), "لا", 0);
  expect(isComplete(session)).toBe(true);
  expect(session.samples).toEqual([
    { expected: "ل", correct: true, latencyMs: null },
    { expected: "ا", correct: true, latencyMs: null },
  ]);
});

test("the second letter of one lam-alef keystroke is never timed, since no time passed", () => {
  const session = typeAll(createSession(buildPrompt("بلا", LETTERS, [2])), ["ب", "لا"], 0, 300);
  expect(session.samples).toEqual([
    { expected: "ب", correct: true, latencyMs: null },
    { expected: "ل", correct: true, latencyMs: 300 },
    { expected: "ا", correct: true, latencyMs: null },
  ]);
});

test("a lam-alef key pressed where neither letter is due leaves two mistakes, like a text field would", () => {
  const session = press(start("بت"), "لا", 0);
  expect(session.mistakes).toEqual(["ل", "ا"]);
  expect(session.errors).toBe(2);
  expect(session.samples).toHaveLength(1);
});

test("a gap longer than the cap is a pause: the key has no latency and the break is not typing time", () => {
  expect(LATENCY_CAP_MS).toBe(3000);
  let session = typeAll(start("بتن"), ["ب", "ت"], 1000, 500);
  session = press(session, "ن", 1500 + 600_000);
  expect(session.samples.at(-1)).toEqual({ expected: "ن", correct: true, latencyMs: null });
  expect(metricsOf(session).elapsedMs).toBe(500 + LATENCY_CAP_MS);
});

test("a gap of exactly the cap still counts as a slow keystroke", () => {
  const session = typeAll(start("بت"), ["ب", "ت"], 0, LATENCY_CAP_MS);
  expect(session.samples.at(-1)?.latencyMs).toBe(LATENCY_CAP_MS);
});

test("pausing stops the clock: time away is not typing time and the next key has no latency", () => {
  let session = typeAll(start("بتن"), ["ب", "ت"], 1000, 400);
  session = pause(session, 1900);
  expect(metricsOf(session).elapsedMs).toBe(900);
  expect(metricsOf(session, 700_000).elapsedMs).toBe(900);
  session = press(session, "ن", 700_000);
  expect(session.samples.at(-1)).toEqual({ expected: "ن", correct: true, latencyMs: null });
  expect(metricsOf(session).elapsedMs).toBe(900);
});

test("pausing before anything is typed, or twice in a row, changes nothing", () => {
  const fresh = start("بت");
  expect(pause(fresh, 500)).toEqual(fresh);
  const paused = pause(press(fresh, "ب", 1000), 1200);
  expect(pause(paused, 9000)).toEqual(paused);
});

test("the live clock runs on from the last key, but never by more than the cap", () => {
  const session = typeAll(start("بتن"), ["ب", "ت"], 1000, 400);
  expect(metricsOf(session).elapsedMs).toBe(400);
  expect(metricsOf(session, 1900).elapsedMs).toBe(900);
  expect(metricsOf(session, 60_000).elapsedMs).toBe(400 + LATENCY_CAP_MS);
});

test("speed is characters per minute of typing time, and a word is five characters", () => {
  const session = typeAll(start("بتنبت"), ["ب", "ت", "ن", "ب", "ت"], 0, 300);
  const metrics = metricsOf(session);
  expect(metrics.elapsedMs).toBe(1200);
  expect(metrics.typedChars).toBe(5);
  expect(metrics.cpm).toBe(250);
  expect(metrics.wpm).toBe(50);
});

test("accuracy is the share of positions typed right the first time", () => {
  let session = typeAll(start("بتنم"), ["ب", "س", "ش"], 0, 100);
  session = applyKey(applyKey(session, BACKSPACE, 300, STRICT), BACKSPACE, 400, STRICT);
  session = typeAll(session, ["ت", "ن", "م"], 500, 100);
  const metrics = metricsOf(session);
  expect(metrics.accuracy).toBe(0.75);
  expect(metrics.errors).toBe(2);
});

test("before anything is typed there is no speed and nothing has gone wrong", () => {
  expect(metricsOf(start("بت"))).toEqual({ elapsedMs: 0, typedChars: 0, cpm: 0, wpm: 0, accuracy: 1, errors: 0 });
});

test("a session can start partway in: earlier units are done and do not count as typed", () => {
  let session = start("بتن", LETTERS, 2);
  expect(session.cursor).toBe(2);
  expect(view(session).doneUntil).toBe(2);
  session = press(session, "ن", 0);
  expect(isComplete(session)).toBe(true);
  expect(metricsOf(session).typedChars).toBe(1);
  expect(session.samples).toHaveLength(1);
});

test("a starting point outside the text is brought back inside it", () => {
  expect(start("بت", LETTERS, -3).cursor).toBe(0);
  expect(start("بت", LETTERS, 99).cursor).toBe(2);
  expect(isComplete(start("بت", LETTERS, 99))).toBe(true);
});

test("a text with nothing to type is complete from the start", () => {
  const session = start("hello");
  expect(isComplete(session)).toBe(true);
  expect(press(session, "ب", 0)).toEqual(session);
});

test("keys after the end change nothing", () => {
  const done = typeAll(start("ب"), ["ب"], 0, 100);
  expect(press(done, "ت", 500)).toEqual(done);
  expect(applyKey(done, BACKSPACE, 600, STRICT)).toEqual(done);
});

test("applying a key never changes the session it was given", () => {
  const before = press(start("بت"), "س", 0);
  const snapshot = structuredClone(before);
  press(before, "ش", 100);
  applyKey(before, BACKSPACE, 200, STRICT);
  expect(before).toEqual(snapshot);
});
