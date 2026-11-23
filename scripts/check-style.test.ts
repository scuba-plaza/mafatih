import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { expect, test } from "vitest";
import { commentLines, sourceFiles } from "./lib/comments.ts";

test.each([
  ["a line comment", "a.ts", "const a = 1;\nconst b = 2; // note\n", [2]],
  ["a block comment", "a.ts", "/* x */\nconst a = 1;\n", [1]],
  ["a triple-slash directive", "a.ts", '/// <reference types="node" />\nexport {};\n', [1]],
  ["a hashbang line", "a.ts", "#!/usr/bin/env node\nexport {};\n", [1]],
  ["a JSX comment", "a.tsx", "export const A = () => <p>{/* x */}</p>;\n", [1]],
  ["a URL inside a string", "a.ts", 'const u = "https://example.com/*not*/";\n', []],
  ["slashes in a template literal and a regex", "a.ts", "const t = `a // b`;\nconst r = /\\/\\//;\n", []],
  ["a CSS block comment", "a.css", "a { color: red; }\n/* x */\n", [2]],
  ["a URL and a string in CSS", "a.css", 'a { background: url("https://x.y/*z*/"); content: "/* no */"; }\n', []],
  ["an HTML comment", "a.html", "<p>a</p>\n<!-- x -->\n", [2]],
  ["HTML without comments", "a.html", "<p>a</p>\n", []],
  ["comments in JSON", "a.json", '{\n  // x\n  "a": 1 /* y */\n}\n', [2, 3]],
  ["slashes in a JSON string", "a.json", '{ "u": "https://x.y/*z*/" }\n', []],
])("%s in %s gives comments on the lines %j", (_, file, source, lines) => {
  expect(commentLines(file, source)).toEqual(lines);
});

test("source that does not parse is an error, not a pass", () => {
  expect(() => commentLines("a.ts", "const = // x\n")).toThrow(/a\.ts/);
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
