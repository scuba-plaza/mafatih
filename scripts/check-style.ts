import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findComments } from "./lib/comments.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const ROOTS = ["src", "scripts", "e2e"];
const ROOT_FILES = ["vite.config.ts", "vitest.config.ts", "playwright.config.ts"];
const SOURCE = /\.(ts|tsx)$/;

function sourcesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && SOURCE.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));
}

const files = [
  ...ROOTS.flatMap((root) => sourcesUnder(join(ROOT, root))),
  ...ROOT_FILES.map((file) => join(ROOT, file)),
];
const findings = files.flatMap((file) =>
  findComments(file, readFileSync(file, "utf8")).map(({ line }) => `${relative(ROOT, file)}:${line}`),
);

if (findings.length > 0) {
  console.error(`Comments are not allowed in code:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`check-style: ${files.length} files, no comments`);
