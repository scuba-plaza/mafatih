export interface LessonFont {
  readonly id: string;
  readonly family: string;
  readonly load: () => Promise<unknown>;
}

export const FONTS = [
  { id: "noto-naskh", family: "Noto Naskh Arabic", load: () => import("@fontsource/noto-naskh-arabic/arabic-400.css") },
  { id: "scheherazade", family: "Scheherazade New", load: () => import("@fontsource/scheherazade-new/arabic-400.css") },
  { id: "amiri", family: "Amiri", load: () => import("@fontsource/amiri/arabic-400.css") },
] as const satisfies readonly LessonFont[];

export function loadFont(font: LessonFont): void {
  font.load().catch(() => undefined);
}

export type FontId = (typeof FONTS)[number]["id"];

export const DEFAULT_FONT: FontId = "noto-naskh";

export const FONT_SIZES: readonly number[] = [28, 32, 36, 40, 44, 48, 56, 64, 72];

export const DEFAULT_FONT_SIZE = 40;

export function isFontId(value: unknown): value is FontId {
  return FONTS.some((font) => font.id === value);
}

export function clampFontSize(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return DEFAULT_FONT_SIZE;
  }
  return FONT_SIZES.reduce((nearest, size) => (Math.abs(size - value) < Math.abs(nearest - value) ? size : nearest));
}
