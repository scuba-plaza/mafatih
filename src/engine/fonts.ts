import { nearestStep } from "~/engine/guards.ts";

export type FontId = "naskh" | "scheherazade" | "amiri";

export interface FontOption {
  id: FontId;
  name: string;
  stack: string;
  note: string;
}

const NASKH: FontOption = {
  id: "naskh",
  name: "Noto Naskh Arabic",
  stack: '"Noto Naskh Arabic", serif',
  note: "even, roomy harakat",
};

export const FONTS: readonly FontOption[] = [
  NASKH,
  {
    id: "scheherazade",
    name: "Scheherazade New",
    stack: '"Scheherazade New", serif',
    note: "drawn for fully vocalised text",
  },
  { id: "amiri", name: "Amiri", stack: '"Amiri", serif', note: "classical naskh" },
];

export const DEFAULT_FONT: FontId = NASKH.id;

const BY_ID: ReadonlyMap<string, FontOption> = new Map(FONTS.map((f) => [f.id, f]));

export function isFontId(value: unknown): value is FontId {
  return typeof value === "string" && BY_ID.has(value);
}

export function fontOption(id: FontId): FontOption {
  return BY_ID.get(id) ?? NASKH;
}

export function fontStack(id: FontId): string {
  return fontOption(id).stack;
}

export const FONT_SIZES: readonly number[] = [28, 32, 36, 40, 44, 48, 56, 64, 72];

export const DEFAULT_FONT_SIZE = 48;

export function clampFontSize(value: unknown): number {
  return nearestStep(value, FONT_SIZES, DEFAULT_FONT_SIZE);
}
