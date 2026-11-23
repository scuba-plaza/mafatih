import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { HIGHLIGHT_NAMES, highlightName } from "~/typing/paint.ts";

const CSS = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const RULE = /([^{}]+)\{([^{}]*)\}/g;

function highlightRules(): { names: string[]; body: string }[] {
  return [...CSS.matchAll(RULE)]
    .map((match) => ({ selector: match[1] ?? "", body: match[2] ?? "" }))
    .filter(({ selector }) => selector.includes("::highlight("))
    .map(({ selector, body }) => ({
      names: [...selector.matchAll(/::highlight\(([^)]+)\)/g)].map((found) => found[1] ?? ""),
      body,
    }));
}

test("every highlight rule lists the lesson's name and the preview's name in one selector list", () => {
  const rules = highlightRules();
  expect(rules.length).toBeGreaterThan(0);
  for (const { names } of rules) {
    for (const name of names) {
      const base = name.replace(/-preview$/, "");
      expect(names).toContain(base);
      expect(names).toContain(highlightName(base as (typeof HIGHLIGHT_NAMES)[number], "preview"));
    }
  }
});

test("every highlight name is styled for both scopes", () => {
  const styled = new Set(highlightRules().flatMap(({ names }) => names));
  for (const name of HIGHLIGHT_NAMES) {
    expect(styled.has(name)).toBe(true);
    expect(styled.has(highlightName(name, "preview"))).toBe(true);
  }
});
