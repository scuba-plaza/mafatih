import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { findComments, sourceFiles } from "./lib/comments.ts";

test("a line comment is reported with its line", () => {
  expect(findComments("a.ts", "const a = 1;\nconst b = 2; // note\n")).toEqual([{ line: 2 }]);
});

test("a block comment is reported", () => {
  expect(findComments("a.ts", "/* x */\nconst a = 1;\n")).toEqual([{ line: 1 }]);
});

test("a triple-slash directive is reported", () => {
  expect(findComments("a.ts", '/// <reference types="node" />\nexport {};\n')).toEqual([{ line: 1 }]);
});

test("a URL inside a string is not a comment", () => {
  expect(findComments("a.ts", 'const u = "https://example.com/*not*/";\n')).toEqual([]);
});

test("slashes inside a template literal and a regex are not comments", () => {
  expect(findComments("a.ts", "const t = `a // b`;\nconst r = /\\/\\//;\n")).toEqual([]);
});

test("a JSX comment in a tsx file is reported", () => {
  expect(findComments("a.tsx", "export const A = () => <p>{/* x */}</p>;\n")).toEqual([{ line: 1 }]);
});

test("clean source has no findings", () => {
  expect(findComments("a.ts", "export const a: number = 1;\n")).toEqual([]);
});

test("a hashbang line is reported", () => {
  expect(findComments("a.ts", "#!/usr/bin/env node\nexport {};\n")).toEqual([{ line: 1 }]);
});

test("source that does not parse is an error, not a pass", () => {
  expect(() => findComments("a.ts", "const = // x\n")).toThrow(/a\.ts/);
});

test("a CSS block comment is reported, a URL in CSS is not", () => {
  expect(findComments("a.css", "a { color: red; }\n/* x */\n")).toEqual([{ line: 2 }]);
  expect(findComments("a.css", 'a { background: url("https://x.y/*z*/"); content: "/* no */"; }\n')).toEqual([]);
});

test("an HTML comment is reported", () => {
  expect(findComments("a.html", "<p>a</p>\n<!-- x -->\n")).toEqual([{ line: 2 }]);
  expect(findComments("a.html", "<p>a</p>\n")).toEqual([]);
});

test("comments in JSON are reported, slashes in JSON strings are not", () => {
  expect(findComments("a.json", '{\n  // x\n  "a": 1 /* y */\n}\n')).toEqual([{ line: 2 }, { line: 3 }]);
  expect(findComments("a.json", '{ "u": "https://x.y/*z*/" }\n')).toEqual([]);
});

test("the tree scan finds every kind of source file and skips dependencies and build output", () => {
  const root = mkdtempSync(join(tmpdir(), "check-style-"));
  for (const directory of ["src/deep", "scripts", "e2e", "node_modules/x", "dist", "generated", "data"]) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  const files = [
    "src/deep/a.tsx",
    "src/b.css",
    "scripts/c.mjs",
    "e2e/d.ts",
    "index.html",
    "biome.json",
    "vite.config.ts",
    "node_modules/x/e.ts",
    "dist/f.js",
    "generated/g.json",
    "data/h.json",
    "pnpm-lock.yaml",
  ];
  for (const file of files) {
    writeFileSync(join(root, file), "");
  }
  expect(
    sourceFiles(root)
      .map((file) => relative(root, file).replaceAll("\\", "/"))
      .sort(),
  ).toEqual(["biome.json", "e2e/d.ts", "index.html", "scripts/c.mjs", "src/b.css", "src/deep/a.tsx", "vite.config.ts"]);
});

test("Biome rejects the any type in project sources", () => {
  const directory = mkdtempSync(join(import.meta.dirname, "probe-"));
  try {
    writeFileSync(join(directory, "a.ts"), "export const a: any = 1;\n");
    const result = spawnSync("pnpm", ["exec", "biome", "lint", directory], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
    expect(`${result.stdout}${result.stderr}`).toContain("noExplicitAny");
  } finally {
    rmSync(directory, { recursive: true });
  }
});
