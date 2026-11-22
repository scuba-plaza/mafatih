import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const NO_PREFERENCE = "prefers-reduced-motion: no-preference";
const MOVING = /^(animation|animation-name|transition|transition-property)$/;
const REDUCING = "motion-reduce:";

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? sources(path) : [path];
  });
}

const FILES = sources(ROOT).filter((path) => !path.includes(".test."));
const STYLES = FILES.filter((path) => path.endsWith(".css"));
const CODE = FILES.filter((path) => /\.tsx?$/.test(path));

interface Declaration {
  readonly property: string;
  readonly value: string;
  readonly inside: readonly string[];
}

function declarations(css: string): Declaration[] {
  const found: Declaration[] = [];
  const stack: string[] = [];
  let header = "";
  let word = "";
  for (const character of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (character === "{") {
      stack.push(`${header}${word}`.trim());
      header = "";
      word = "";
    } else if (character === "}") {
      stack.pop();
      header = "";
      word = "";
    } else if (character === ";") {
      const [property = "", ...rest] = `${header}${word}`.split(":");
      found.push({ property: property.trim(), value: rest.join(":").trim(), inside: [...stack] });
      header = "";
      word = "";
    } else {
      word += character;
    }
  }
  return found;
}

test("every animation and transition in the stylesheets is only for those who have not asked for calm", () => {
  const ungated: string[] = [];
  for (const path of STYLES) {
    for (const { property, value, inside } of declarations(readFileSync(path, "utf8"))) {
      const moves =
        MOVING.test(property) && value !== "none" && !inside.some((header) => header.startsWith("@keyframes"));
      if (moves && !inside.some((header) => header.includes(NO_PREFERENCE))) {
        ungated.push(`${path.replace(ROOT, "src/")}: ${property}: ${value}`);
      }
    }
  }
  expect(ungated).toEqual([]);
});

test("every transition and animation class in the components has its motion-reduce counterpart", () => {
  const ungated: string[] = [];
  for (const path of CODE) {
    const literals = readFileSync(path, "utf8").match(/(["'`])(?:(?!\1)[^\\]|\\.)*\1/g) ?? [];
    for (const literal of literals) {
      const tokens = literal.slice(1, -1).split(/\s+/);
      const moves = tokens.some((token) => /^(?:[\w[\]&>*-]+:)*(?:transition|animate)(?:-|$)/.test(token));
      if (moves && !literal.includes(REDUCING)) {
        ungated.push(`${path.replace(ROOT, "src/")}: ${literal.slice(0, 80)}`);
      }
    }
  }
  expect(ungated).toEqual([]);
});

test("scrolling that animates and script animations only exist in files that ask for the user's preference", () => {
  const ungated: string[] = [];
  for (const path of CODE) {
    const code = readFileSync(path, "utf8");
    const moves = /behavior:\s*[^,}]*"smooth"|\.animate\(|scroll-behavior/.test(code);
    if (moves && !code.includes("prefers-reduced-motion")) {
      ungated.push(path.replace(ROOT, "src/"));
    }
  }
  expect(ungated).toEqual([]);
});

test("the stylesheets turn off what only exists to be seen moving, for those who asked for calm", () => {
  const css = STYLES.map((path) => readFileSync(path, "utf8")).join("\n");
  expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.celebration-ray\s*\{\s*display:\s*none/);
});
