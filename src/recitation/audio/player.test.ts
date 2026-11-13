import { expect, test } from "vitest";
import { initialPlayer, type PlayerAction, type PlayerState, playerReducer, RESTART_AFTER_SECONDS } from "./player.ts";

function run(actions: readonly PlayerAction[], from: PlayerState = initialPlayer(4)): PlayerState {
  return actions.reduce(playerReducer, from);
}

test("a player starts idle on the first clip of a passage", () => {
  expect(initialPlayer(4)).toMatchObject({ status: "idle", index: 0, count: 4, held: false, whole: false });
});

test("play starts and pause stops, and play with nothing to play does nothing", () => {
  expect(run([{ type: "play" }]).status).toBe("playing");
  expect(run([{ type: "play" }, { type: "pause" }]).status).toBe("paused");
  expect(playerReducer(initialPlayer(0), { type: "play" }).status).toBe("idle");
});

test("while held the player never plays, and a hold that begins during playback is lifted by resuming it", () => {
  expect(run([{ type: "hold", held: true }, { type: "play" }]).status).toBe("idle");
  const held = run([{ type: "play" }, { type: "hold", held: true }]);
  expect(held.status).toBe("paused");
  expect(run([{ type: "hold", held: false }], held).status).toBe("playing");
  const stoppedBefore = run([
    { type: "play" },
    { type: "pause" },
    { type: "hold", held: true },
    { type: "hold", held: false },
  ]);
  expect(stoppedBefore.status).toBe("paused");
});

test("Next steps to the following clip and stays on the last one", () => {
  expect(run([{ type: "next" }]).index).toBe(1);
  expect(run([{ type: "next" }, { type: "next" }, { type: "next" }, { type: "next" }]).index).toBe(3);
});

test("Previous restarts the clip after more than two seconds, otherwise steps back, and never goes below the first", () => {
  const onSecond = run([{ type: "next" }]);
  const restarted = playerReducer(onSecond, { type: "previous", elapsed: RESTART_AFTER_SECONDS + 0.1 });
  expect(restarted.index).toBe(1);
  expect(restarted.restarts).toBe(onSecond.restarts + 1);
  expect(playerReducer(onSecond, { type: "previous", elapsed: RESTART_AFTER_SECONDS }).index).toBe(0);
  expect(playerReducer(onSecond, { type: "previous", elapsed: 0.5 }).index).toBe(0);
  const first = initialPlayer(4);
  const again = playerReducer(first, { type: "previous", elapsed: 0.5 });
  expect(again.index).toBe(0);
  expect(again.restarts).toBe(first.restarts + 1);
});

test("a clip that ends stops the player, unless the whole passage is to be played: then the next clip follows", () => {
  expect(run([{ type: "play" }, { type: "ended" }])).toMatchObject({ status: "paused", index: 0 });
  const whole = run([{ type: "whole", value: true }, { type: "play" }, { type: "ended" }]);
  expect(whole).toMatchObject({ status: "playing", index: 1 });
});

test("when the last clip of the whole passage ends the player stops, ready to start from the top", () => {
  const lastClip = run([
    { type: "whole", value: true },
    { type: "play" },
    { type: "next" },
    { type: "next" },
    { type: "next" },
  ]);
  expect(lastClip.index).toBe(3);
  expect(run([{ type: "ended" }], lastClip)).toMatchObject({ status: "paused", index: 0 });
});

test("a player repeats nothing by default", () => {
  expect(initialPlayer(4).loop).toBe(false);
});

test("with repeat on, the end of the last clip of the whole passage starts the passage again and keeps playing", () => {
  const onLast = run([
    { type: "loop", value: true },
    { type: "whole", value: true },
    { type: "play" },
    { type: "next" },
    { type: "next" },
    { type: "next" },
  ]);
  expect(onLast.index).toBe(3);
  expect(run([{ type: "ended" }], onLast)).toMatchObject({ status: "playing", index: 0 });
});

test("with repeat on, a passage of one clip starts that clip over when it ends", () => {
  const single = run(
    [{ type: "loop", value: true }, { type: "whole", value: true }, { type: "play" }, { type: "ended" }],
    initialPlayer(1),
  );
  expect(single).toMatchObject({ status: "playing", index: 0 });
  expect(single.restarts).toBe(1);
});

test("with repeat on but not the whole passage, each clip still stops at its end, and the last one starts the passage over", () => {
  const first = run([{ type: "loop", value: true }, { type: "play" }, { type: "ended" }]);
  expect(first).toMatchObject({ status: "paused", index: 0 });
  const last = run([
    { type: "loop", value: true },
    { type: "play" },
    { type: "next" },
    { type: "next" },
    { type: "next" },
  ]);
  expect(run([{ type: "ended" }], last)).toMatchObject({ status: "playing", index: 0 });
});

test("with repeat on, Next on the last clip goes round to the first and changes nothing else", () => {
  const paused = run([{ type: "loop", value: true }, { type: "next" }, { type: "next" }, { type: "next" }]);
  expect(run([{ type: "next" }], paused)).toMatchObject({ status: "idle", index: 0 });
  const playing = run([{ type: "play" }], paused);
  expect(run([{ type: "next" }], playing)).toMatchObject({ status: "playing", index: 0 });
  expect(run([{ type: "next" }], { ...paused, index: 0, count: 1, status: "playing" }).restarts).toBe(1);
  expect(run([{ type: "next" }, { type: "next" }, { type: "next" }, { type: "next" }]).index).toBe(3);
});

test("the repeat choice survives a new passage", () => {
  const repeating = run([{ type: "loop", value: true }, { type: "play" }]);
  expect(playerReducer(repeating, { type: "load", count: 2 }).loop).toBe(true);
});

test("a failed fetch is shown as failed, and Play tries again", () => {
  const failed = run([{ type: "play" }, { type: "failed" }]);
  expect(failed.status).toBe("failed");
  expect(run([{ type: "play" }], failed).status).toBe("playing");
});

test("a new passage starts again from its first clip, keeps playing if the player was playing, and keeps the whole-passage choice", () => {
  const playing = run([{ type: "whole", value: true }, { type: "play" }, { type: "next" }]);
  const next = playerReducer(playing, { type: "load", count: 3 });
  expect(next).toMatchObject({ status: "playing", index: 0, count: 3, whole: true });
  const paused = run([{ type: "play" }, { type: "pause" }, { type: "next" }]);
  expect(playerReducer(paused, { type: "load", count: 3 })).toMatchObject({ status: "paused", index: 0 });
  expect(playerReducer(playing, { type: "load", count: 0 }).status).toBe("idle");
});

test("a new passage while held does not start playing", () => {
  const held = run([{ type: "play" }, { type: "hold", held: true }]);
  expect(playerReducer(held, { type: "load", count: 3 }).status).toBe("paused");
});

test("a rest, as when the lesson is finished, pauses what plays, and the learner can still press Play", () => {
  const rested = run([{ type: "play" }, { type: "rest", resting: true }]);
  expect(rested.status).toBe("paused");
  expect(run([{ type: "play" }], rested)).toMatchObject({ status: "playing", resume: false });
});

test("a rest that ends goes on with what it paused, but not with what the learner had paused", () => {
  const paused = run([{ type: "play" }, { type: "rest", resting: true }]);
  expect(run([{ type: "rest", resting: false }], paused).status).toBe("playing");
  const stopped = run([
    { type: "play" },
    { type: "pause" },
    { type: "rest", resting: true },
    { type: "rest", resting: false },
  ]);
  expect(stopped.status).toBe("paused");
});

test("a hold on top of a rest is lifted only when both are over", () => {
  const both = run([{ type: "play" }, { type: "rest", resting: true }, { type: "hold", held: true }]);
  expect(run([{ type: "hold", held: false }], both).status).toBe("paused");
  expect(
    run(
      [
        { type: "hold", held: false },
        { type: "rest", resting: false },
      ],
      both,
    ).status,
  ).toBe("playing");
});

test("a dialog opened over a recitation the learner started during a rest pauses it", () => {
  const started = run([{ type: "rest", resting: true }, { type: "play" }]);
  expect(started.status).toBe("playing");
  expect(run([{ type: "hold", held: true }], started).status).toBe("paused");
});
