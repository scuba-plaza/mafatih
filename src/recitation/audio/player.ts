export const RESTART_AFTER_SECONDS = 2;

export type PlayerStatus = "idle" | "playing" | "paused" | "failed";

export interface PlayerState {
  readonly status: PlayerStatus;
  readonly index: number;
  readonly count: number;
  readonly held: boolean;
  readonly resume: boolean;
  readonly whole: boolean;
  readonly restarts: number;
}

export type PlayerAction =
  | { readonly type: "play" }
  | { readonly type: "pause" }
  | { readonly type: "next" }
  | { readonly type: "previous"; readonly elapsed: number }
  | { readonly type: "ended" }
  | { readonly type: "failed" }
  | { readonly type: "hold"; readonly held: boolean }
  | { readonly type: "whole"; readonly value: boolean }
  | { readonly type: "load"; readonly count: number };

export function initialPlayer(count: number): PlayerState {
  return { status: "idle", index: 0, count, held: false, resume: false, whole: false, restarts: 0 };
}

function hold(state: PlayerState, held: boolean): PlayerState {
  if (held) {
    const resume = state.held ? state.resume : state.status === "playing";
    return { ...state, held: true, resume, status: state.status === "playing" ? "paused" : state.status };
  }
  return { ...state, held: false, resume: false, status: state.resume ? "playing" : state.status };
}

function ended(state: PlayerState): PlayerState {
  if (!state.whole) {
    return { ...state, status: "paused" };
  }
  return state.index < state.count - 1
    ? { ...state, index: state.index + 1 }
    : { ...state, index: 0, status: "paused" };
}

function load(state: PlayerState, count: number): PlayerState {
  const wasPlaying = state.status === "playing" || state.resume;
  const status =
    count === 0 || state.status === "failed" ? "idle" : wasPlaying && !state.held ? "playing" : state.status;
  const held = wasPlaying && state.held && count > 0;
  return {
    ...state,
    count,
    index: 0,
    status: held ? "paused" : status,
    resume: held,
  };
}

export function playerReducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case "play":
      return state.held || state.count === 0 ? state : { ...state, status: "playing", resume: false };
    case "pause":
      return state.status === "playing" ? { ...state, status: "paused", resume: false } : state;
    case "next":
      return state.index < state.count - 1 ? { ...state, index: state.index + 1 } : state;
    case "previous":
      return action.elapsed > RESTART_AFTER_SECONDS || state.index === 0
        ? { ...state, restarts: state.restarts + 1 }
        : { ...state, index: state.index - 1 };
    case "ended":
      return ended(state);
    case "failed":
      return { ...state, status: "failed", resume: false };
    case "hold":
      return hold(state, action.held);
    case "whole":
      return { ...state, whole: action.value };
    case "load":
      return load(state, action.count);
  }
}
