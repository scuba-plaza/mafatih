import { type InputHTMLAttributes, type RefObject, useCallback, useEffect, useRef, useState } from "react";
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

export function useTrainer({ prompt, options, onComplete }: TrainerConfig): Trainer {
  const [session, setSession] = useState(() => createSession(prompt));
  const [wrongLayout, setWrongLayout] = useState(false);
  const optionsRef = useRef(options);
  const onCompleteRef = useRef(onComplete);
  const reported = useRef<Session | null>(null);

  useEffect(() => {
    optionsRef.current = options;
    onCompleteRef.current = onComplete;
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
    if (isComplete(session) && session.finishedAt !== null && reported.current !== session) {
      reported.current = session;
      onCompleteRef.current({ metrics: metricsOf(session), samples: session.samples });
    }
  }, [session]);

  const focus = useCallback(() => inputRef.current?.focus(), [inputRef]);

  const restart = useCallback(() => {
    setSession((current) => createSession(current.prompt));
    inputRef.current?.focus();
  }, [inputRef]);

  return { session, options, focused, wrongLayout, inputRef, inputProps, focus, restart };
}
