import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const PREVIEW_FILES = ["LessonPreview.tsx", "PreviewPeek.tsx", "PreviewScale.tsx", "previewSession.ts"] as const;

const FORBIDDEN = [
  "fontFamily",
  "fontSize",
  "text-center",
  "leading-",
  "::highlight",
  "text-upcoming",
  "text-typed",
  "text-apparatus",
  "data-key",
  "data-due",
  "data-block",
  "data-lesson-text",
] as const;

const ALLOWED_IMPORTS = [
  "react",
  "~/i18n/I18nProvider.tsx",
  "~/keyboard/GuideKeyboard.tsx",
  "~/practice/ladder.ts",
  "~/storage/ProfileProvider.tsx",
  "~/text/prompt.ts",
  "~/text/vocalization.ts",
  "~/typing/session.ts",
  "~/typing/TypingSurface.tsx",
  "~/typing/useTrainer.ts",
  "~/ui/Dialog.tsx",
  "~/ui/styles.ts",
  "./LessonPreview.tsx",
  "./previewSession.ts",
  "./settings.ts",
] as const;

function violations(source: string): string[] {
  const forbidden = FORBIDDEN.filter((word) => source.includes(word)).map((word) => `uses ${word}`);
  const imports = [...source.matchAll(/from "([^"]+)"/g)]
    .map((match) => match[1] ?? "")
    .filter((path) => !(ALLOWED_IMPORTS as readonly string[]).includes(path))
    .map((path) => `imports ${path}`);
  return [...forbidden, ...imports];
}

test("the preview only mounts the lesson's own components: no lesson styles of its own, no other imports", () => {
  for (const file of PREVIEW_FILES) {
    const source = readFileSync(new URL(`./${file}`, import.meta.url), "utf8");
    expect({ file, found: violations(source) }).toEqual({ file, found: [] });
  }
});

test("the boundary check catches a preview that copies the lesson's styling or reaches elsewhere", () => {
  const copied = `import { x } from "~/keyboard/layout101.ts";\nconst style = { fontFamily: "serif", fontSize: 40 };`;
  expect(violations(copied)).toEqual(["uses fontFamily", "uses fontSize", "imports ~/keyboard/layout101.ts"]);
});
