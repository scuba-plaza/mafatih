import assert from "node:assert/strict";
import { test } from "node:test";
import { visibleViewportHeight } from "~/hooks/useVisualViewport.ts";

test("without a visual viewport the height falls back to the layout viewport", () => {
  assert.equal(visibleViewportHeight(null, 812), 812);
  assert.equal(visibleViewportHeight(null, 0), 0);
});

test("the keyboard shrinking the visual viewport shrinks the height", () => {
  const vv = { height: 360, offsetTop: 0 };
  assert.equal(visibleViewportHeight(vv, 812), 360);
});

test("an offset visual viewport counts the part above it as visible", () => {
  const vv = { height: 300, offsetTop: 60 };
  assert.equal(visibleViewportHeight(vv, 812), 360);
});

test("the height never exceeds the layout viewport", () => {
  const vv = { height: 700, offsetTop: 200 };
  assert.equal(visibleViewportHeight(vv, 812), 812);
});

test("a stale value larger than the window is ignored", () => {
  const vv = { height: 900, offsetTop: 0 };
  assert.equal(visibleViewportHeight(vv, 812), 812);
});
