import assert from "node:assert/strict";
import { test } from "node:test";
import { isInteractive } from "~/components/ui.ts";

test("taps inside interactive elements do not steal focus", () => {
  const button = { closest: () => ({ tagName: "BUTTON" }) };
  const link = { closest: () => ({ tagName: "A" }) };
  assert.equal(isInteractive(button), true);
  assert.equal(isInteractive(link), true);
});

test("taps on svg icons inside buttons do not steal focus", () => {
  const svgInsideButton = { closest: () => ({ tagName: "BUTTON" }) };
  assert.equal(isInteractive(svgInsideButton), true);
});

test("taps on plain elements and bare svgs steal focus", () => {
  const div = { closest: () => null };
  const bareSvg = { closest: () => null };
  assert.equal(isInteractive(div), false);
  assert.equal(isInteractive(bareSvg), false);
});

test("taps with no target steal focus", () => {
  assert.equal(isInteractive(null), false);
});
