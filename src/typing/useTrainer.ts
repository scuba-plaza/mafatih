import { type InputHTMLAttributes, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { Prompt } from "~/text/prompt.ts";
import {
  applyKey,
  createSession,
  isComplete,
  type Key,
  type Metrics,
  metricsOf,
  pause,
  type Sample,
  type Session,
  type SessionOptions,
} from "./session.ts";
import { useTypingInput } from "./useTypingInput.ts";

export interface TrainerResult {
  readonly metrics: Metrics;
  readonly samples: readonly Sample[];
}

export interface TrainerConfig {
  readonly prompt: Prompt;
  readonly options: SessionOptions;
  readonly onComplete: (result: TrainerResult) => void;
  readonly checkpoints?: readonly number[];
  readonly onCheckpoint?: (index: number, samples: readonly Sample[]) => void;
}

export interface Trainer {
  readonly session: Session;
  readonly options: SessionOptions;
  readonly focused: boolean;
  readonly wrongLayout: boolean;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly inputProps: InputHTMLAttributes<HTMLInputElement>;
  readonly focus: () => void;
  readonly restart: () => void;
}

const NO_CHECKPOINTS: readonly number[] = [];

export function useTrainer(config: TrainerConfig): Trainer {
  const { prompt, options, onComplete, checkpoints = NO_CHECKPOINTS, onCheckpoint } = config;
  const [session, setSession] = useState(() => createSession(prompt));
  const [wrongLayout, setWrongLayout] = useState(false);
  const optionsRef = useRef(options);
  const onCompleteRef = useRef(onComplete);
  const checkpointsRef = useRef(checkpoints);
  const onCheckpointRef = useRef(onCheckpoint);
  const reported = useRef<Session | null>(null);
  const passed = useRef({ prompt, checkpoints: 0, samples: 0 });

  useEffect(() => {
    optionsRef.current = options;
    onCompleteRef.current = onComplete;
    checkpointsRef.current = checkpoints;
    onCheckpointRef.current = onCheckpoint;
  });

  if (session.prompt !== prompt) {
    setSession(createSession(prompt));
  }

  const onKey = useCallback((key: Key, at: number) => {
    setWrongLayout(false);
    setSession((current) => applyKey(current, key, at, optionsRef.current));
  }, []);

  const onWrongLayout = useCallback(() => setWrongLayout(true), []);

  const { ref: inputRef, focused, inputProps } = useTypingInput({ onKey, onWrongLayout });

  useEffect(() => {
    if (!focused) {
      setSession((current) => pause(current, performance.now()));
      setWrongLayout(false);
    }
  }, [focused]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        setSession((current) => pause(current, performance.now()));
      }
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    const marks = checkpointsRef.current;
    if (passed.current.prompt !== session.prompt) {
      passed.current = { prompt: session.prompt, checkpoints: 0, samples: 0 };
    }
    for (
      let index = passed.current.checkpoints;
      session.cursor > (marks[index] ?? Number.POSITIVE_INFINITY);
      index += 1
    ) {
      const samples = session.samples.slice(passed.current.samples);
      passed.current = { prompt: session.prompt, checkpoints: index + 1, samples: session.samples.length };
      onCheckpointRef.current?.(index, samples);
    }
  }, [session]);

  useEffect(() => {
    if (isComplete(session) && session.finishedAt !== null && reported.current !== session) {
      reported.current = session;
      onCompleteRef.current({ metrics: metricsOf(session), samples: session.samples });
    }
  }, [session]);

  const focus = useCallback(() => inputRef.current?.focus(), [inputRef]);

  const restart = useCallback(() => {
    passed.current = { prompt: passed.current.prompt, checkpoints: 0, samples: 0 };
    flushSync(() => setSession((current) => createSession(current.prompt)));
    inputRef.current?.focus();
  }, [inputRef]);

  return { session, options, focused, wrongLayout, inputRef, inputProps, focus, restart };
}
