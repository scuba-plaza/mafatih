import { CORE_HARAKAT, HARAKAT, TYPEABLE } from "~/engine/layout/ara.ts";
import { expandLigatures } from "~/engine/layout/ligatures.ts";

export type Tier = "none" | "core" | "full";

export const TIERS: readonly Tier[] = ["none", "core", "full"];

const NO_HARAKAT: ReadonlySet<string> = new Set();

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as readonly string[]).includes(value);
}

function keepChars(text: string, keep: (char: string) => boolean): string {
  let out = "";
  for (const char of text) {
    if (keep(char)) {
      out += char;
    }
  }
  return out;
}

function collapseSpaces(text: string): string {
  return text.replace(/ {2,}/g, " ").trim();
}

export function composeText(raw: string): string {
  return expandLigatures(raw.normalize("NFC"));
}

export function normalizeText(raw: string): string {
  return collapseSpaces(keepChars(composeText(raw), (char) => TYPEABLE.has(char)));
}

export function stripToTier(text: string, tier: Tier): string {
  if (tier === "full") {
    return text;
  }
  const keep = tier === "core" ? CORE_HARAKAT : NO_HARAKAT;
  return collapseSpaces(keepChars(text, (char) => !HARAKAT.has(char) || keep.has(char)));
}

export function skeleton(text: string): string {
  return keepChars(text, (char) => !HARAKAT.has(char));
}

export function untypeableChars(text: string): string[] {
  const bad = new Set<string>();
  for (const char of text) {
    if (!TYPEABLE.has(char)) {
      bad.add(char);
    }
  }
  return [...bad];
}
