import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { type Chunk, entryNameOf, sizeProblems } from "./lib/size-rules.ts";

const ROOT = resolve(fileURLToPath(new URL("..", import.meta.url)));
const DIST = resolve(ROOT, "dist");
const ASSETS = resolve(DIST, "assets");

const chunks: Chunk[] = readdirSync(ASSETS)
  .filter((name) => name.endsWith(".js"))
  .map((name) => {
    const text = readFileSync(resolve(ASSETS, name), "utf8");
    return { name, gzipBytes: gzipSync(text).length, text };
  });

const entry = entryNameOf(readFileSync(resolve(DIST, "index.html"), "utf8"));
const words = readFileSync(resolve(ROOT, "data/practice/words.tsv"), "utf8")
  .split("\n")
  .map((line) => line.split("\t")[0] ?? "")
  .filter((word) => word !== "");

const problems = entry === null ? ["dist/index.html has no module script"] : sizeProblems(chunks, entry, words);

if (problems.length > 0) {
  console.error(`check-size:\n${problems.join("\n")}`);
  process.exit(1);
}
console.log(`check-size: ${chunks.length} chunks within their limits`);
