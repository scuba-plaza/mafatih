import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";

const SOURCE_ROOT = join(import.meta.dirname, "..");
const OWN_DIALOG = new Set(["ui/Dialog.tsx", "recitation/SurahComplete.tsx"]);

function sources(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) {
      return sources(path);
    }
    return path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

test("every dialog is the shared Dialog, except the surah celebration", () => {
  const own = sources(SOURCE_ROOT)
    .filter((path) => readFileSync(path, "utf8").includes("<dialog"))
    .map((path) => path.slice(SOURCE_ROOT.length + 1));
  expect(own.sort()).toEqual([...OWN_DIALOG].sort());
});

test("every confirmation goes through ConfirmDialog", () => {
  const files = sources(SOURCE_ROOT).map((path) => path.slice(SOURCE_ROOT.length + 1));
  expect(files).not.toContain("ui/ConfirmChoice.tsx");
});
