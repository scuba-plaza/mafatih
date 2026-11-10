import { expect, test } from "vitest";
import { findComments } from "./lib/comments.ts";

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
