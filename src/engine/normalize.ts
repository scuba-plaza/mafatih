import { CORE_HARAKAT, HARAKAT, LIGATURES, TYPEABLE } from "./layout.ts";

export type Tier = "none" | "core" | "full";
export const TIERS: readonly Tier[] = ["none", "core", "full"];

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
  let out = "";
  for (const char of raw.normalize("NFC")) {
    out += LIGATURES.get(char) ?? char;
  }
  return out;
}

export function normalizeText(raw: string): string {
  return collapseSpaces(keepChars(composeText(raw), (char) => TYPEABLE.has(char)));
}

export function stripToTier(text: string, tier: Tier): string {
  if (tier === "full") {
    return text;
  }
  const keep = tier === "core" ? CORE_HARAKAT : null;
  return collapseSpaces(keepChars(text, (char) => !HARAKAT.has(char) || (keep !== null && keep.has(char))));
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

export function hasHaraka(text: string): boolean {
  for (const char of text) {
    if (HARAKAT.has(char)) {
      return true;
    }
  }
  return false;
}
