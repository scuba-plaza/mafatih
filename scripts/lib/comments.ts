import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseSync } from "oxc-parser";

export interface CommentFinding {
  line: number;
}

const SCRIPT = /\.[mc]?[jt]sx?$/;
const CHECKED = /\.([mc]?[jt]sx?|css|html|json)$/;
const SOURCE_DIRECTORIES = ["src", "scripts", "e2e"];

function lineAt(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

function inScript(filename: string, source: string): number[] {
  const { comments, errors } = parseSync(filename, source);
  if (errors.length > 0) {
    throw new Error(`cannot parse ${filename}: ${errors[0]?.message ?? "syntax error"}`);
  }
  return [...(source.startsWith("#!") ? [0] : []), ...comments.map((comment) => comment.start)];
}

function outsideStrings(source: string, lineComments: boolean): number[] {
  const found: number[] = [];
  let index = 0;
  while (index < source.length) {
    const char = source[index];
    const pair = source.slice(index, index + 2);
    if (char === '"' || char === "'") {
      index += 1;
      while (index < source.length && source[index] !== char) {
        index += source[index] === "\\" ? 2 : 1;
      }
      index += 1;
    } else if (pair === "/*") {
      found.push(index);
      const end = source.indexOf("*/", index + 2);
      index = end < 0 ? source.length : end + 2;
    } else if (lineComments && pair === "//") {
      found.push(index);
      const end = source.indexOf("\n", index);
      index = end < 0 ? source.length : end;
    } else {
      index += 1;
    }
  }
  return found;
}

function commentStarts(filename: string, source: string): number[] {
  if (SCRIPT.test(filename)) {
    return inScript(filename, source);
  }
  if (filename.endsWith(".html")) {
    return [...source.matchAll(/<!--/g)].map((match) => match.index);
  }
  return outsideStrings(source, filename.endsWith(".json"));
}

export function findComments(filename: string, source: string): readonly CommentFinding[] {
  return commentStarts(filename, source).map((start) => ({ line: lineAt(source, start) }));
}

export function sourceFiles(root: string): string[] {
  const top = readdirSync(root, { withFileTypes: true }).filter((entry) => entry.isFile());
  const nested = SOURCE_DIRECTORIES.flatMap((directory) =>
    readdirSync(join(root, directory), { withFileTypes: true, recursive: true }).filter((entry) => entry.isFile()),
  );
  return [...top, ...nested]
    .filter((entry) => CHECKED.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}
