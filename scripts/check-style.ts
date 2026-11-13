import { readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findComments, sourceFiles } from "./lib/comments.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));

const files = sourceFiles(ROOT);
const findings = files.flatMap((file) =>
  findComments(file, readFileSync(file, "utf8")).map(({ line }) => `${relative(ROOT, file)}:${line}`),
);

if (findings.length > 0) {
  console.error(`Comments are not allowed in code:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`check-style: ${files.length} files, no comments`);
