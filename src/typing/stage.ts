export const MIN_WINDOW_LINES = 2;
export const OVERFLOW_TOLERANCE = 2;

export interface StageMetrics {
  readonly stage: number;
  readonly lineHeight: number;
  readonly padTop: number;
  readonly gapAboveGuide: number;
  readonly guide: number;
  readonly below: number;
}

export function fitsGuide({ stage, lineHeight, padTop, gapAboveGuide, guide, below }: StageMetrics): boolean {
  return stage >= MIN_WINDOW_LINES * lineHeight + padTop + gapAboveGuide + guide + below;
}

export function toPixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function wholeLines(available: number, lineHeight: number, padTop: number): number {
  const lines = Math.floor((available - padTop) / lineHeight);
  return Number.isFinite(lines) ? Math.max(1, lines) : 1;
}

export function windowHeight(lines: number, lineHeight: number, padTop: number): number {
  return lines * lineHeight + padTop;
}

export function caretRow(lines: number): 0 | 1 {
  return lines >= 3 ? 1 : 0;
}

export function caretScrollTop(
  caretTop: number,
  caretHeight: number,
  row: 0 | 1,
  lineHeight: number,
  padTop: number,
): number {
  return caretTop - padTop - row * lineHeight - (lineHeight - caretHeight) / 2;
}
