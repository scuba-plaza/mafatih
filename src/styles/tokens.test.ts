import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const TEXT = 4.5;
const UI = 3;
const UPCOMING_FLOOR = 3;

const PAIRS: readonly (readonly [string, string, number])[] = [
  ["ink", "page", TEXT],
  ["ink", "surface", TEXT],
  ["muted", "page", TEXT],
  ["muted", "surface", TEXT],
  ["apparatus", "page", TEXT],
  ["accent", "page", TEXT],
  ["accent", "surface", TEXT],
  ["danger", "page", TEXT],
  ["danger", "surface", TEXT],
  ["on-accent", "accent", TEXT],
  ["focus", "page", UI],
  ["focus", "surface", UI],
  ["edge", "page", UI],
  ["edge", "surface", UI],
  ["ink", "upcoming", TEXT],
  ["upcoming", "page", UPCOMING_FLOOR],
];

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const palette = new Map(
  [...css.matchAll(/--color-([\w-]+):\s*(#[0-9a-f]{6})\b/gi)].map((m) => [m[1] ?? "", m[2] ?? ""]),
);

function luminance(hex: string): number {
  const channel = (offset: number): number => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

test("the contrast formula matches the WCAG reference values", () => {
  expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  expect(contrast("#ffffff", "#ffffff")).toBe(1);
});

test("there is one palette: no light values, no scheme switch and no finger tints", () => {
  expect(css).not.toContain("prefers-color-scheme");
  expect([...palette.keys()].some((name) => name.startsWith("finger-"))).toBe(false);
});

test("the page is the dark background of the Focus design", () => {
  expect(palette.get("page")).toBe("#08090b");
  expect(palette.get("accent")).toBe("#e2b062");
});

for (const [foreground, background, minimum] of PAIRS) {
  test(`${foreground} on ${background} has a contrast of at least ${minimum}:1`, () => {
    const fg = palette.get(foreground);
    const bg = palette.get(background);
    expect(fg, `--color-${foreground}`).toBeDefined();
    expect(bg, `--color-${background}`).toBeDefined();
    expect(contrast(fg ?? "", bg ?? "")).toBeGreaterThanOrEqual(minimum);
  });
}
