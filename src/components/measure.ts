import type { Advance } from "~/engine/session/lines.ts";

export interface Column {
  width: number;
  fontSize: number;
  style: string;
  weight: string;
  family: string;
}

export interface Fit {
  limit: number;
  advanceOf: Advance | undefined;
}

export interface Band {
  from: number;
  to: number;
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Ink {
  ascent: number;
  descent: number;
  baseline: number;
}

interface Point {
  node: Node;
  offset: number;
}

const BAND_PAD_X = 0.09;
const BAND_PAD_Y = 0.06;

export const MARK_SIZE_EM = 0.82;
export const MARK_GAP_EM = 0.08;

let measurer: CanvasRenderingContext2D | null | undefined;

function measure(font: string): CanvasRenderingContext2D | null {
  if (measurer === undefined) {
    measurer = document.createElement("canvas").getContext("2d");
  }
  if (measurer === null) {
    return null;
  }
  measurer.font = font;
  return measurer;
}

export function widthOf(text: string, font: string): number {
  return measure(font)?.measureText(text).width ?? 0;
}

function inkOf(text: string, font: string): Ink | null {
  const context = text.trim() === "" ? null : measure(font);
  if (context === null) {
    return null;
  }
  const metrics = context.measureText(text);
  const ascent = metrics.actualBoundingBoxAscent;
  const descent = metrics.actualBoundingBoxDescent;
  if (!Number.isFinite(ascent) || !Number.isFinite(descent) || ascent + descent <= 0) {
    return null;
  }
  return { ascent, descent, baseline: metrics.fontBoundingBoxAscent };
}

export function fontAt(column: Column, size: number): string {
  return `${column.style} ${column.weight} ${size}px ${column.family}`;
}

function fontOf(element: Element): string {
  const style = getComputedStyle(element);
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

function utf16Offset(text: string, charIndex: number): number {
  let offset = 0;
  let seen = 0;
  for (const char of text) {
    if (seen >= charIndex) {
      break;
    }
    offset += char.length;
    seen += 1;
  }
  return offset;
}

function locate(root: ParentNode | null, index: number): Point | null {
  if (root === null) {
    return null;
  }
  for (const segment of root.querySelectorAll<HTMLElement>("[data-seg-start]")) {
    const start = Number(segment.dataset.segStart);
    const end = Number(segment.dataset.segEnd);
    const node = segment.firstChild;
    if (node === null || node.nodeType !== Node.TEXT_NODE || index < start || index > end) {
      continue;
    }
    return { node, offset: utf16Offset(segment.textContent ?? "", index - start) };
  }
  return null;
}

export function rangeBetween(root: ParentNode | null, from: number, to: number): Range | null {
  const head = locate(root, from);
  const tail = locate(root, to);
  if (head === null || tail === null) {
    return null;
  }
  const range = document.createRange();
  range.setStart(head.node, head.offset);
  range.setEnd(tail.node, tail.offset);
  return range;
}

export function bandFor(root: ParentNode, index: number, from: number, to: number): Band | null {
  const container = root.querySelector(`[data-line-index="${index}"]`);
  if (!(container instanceof HTMLElement)) {
    return null;
  }
  const text = container.querySelector("[data-cy=line-untyped]");
  const range = rangeBetween(text, from, to);
  if (range === null) {
    return null;
  }
  const rects = [...range.getClientRects()];
  const rect = range.getBoundingClientRect();
  const slice = range.toString();
  range.detach();
  if (rect.width === 0) {
    return null;
  }

  const box = container.getBoundingClientRect();
  const ink = text === null ? null : inkOf(slice, fontOf(text));
  const baseline = rect.top + (ink?.baseline ?? 0);
  const top = ink === null ? Math.min(rect.top, ...rects.map((r) => r.top)) : baseline - ink.ascent;
  const bottom = ink === null ? Math.max(rect.bottom, ...rects.map((r) => r.bottom)) : baseline + ink.descent;
  const em = Number.parseFloat(getComputedStyle(container).fontSize) || rect.height;
  const padX = em * BAND_PAD_X;
  const padY = em * BAND_PAD_Y;
  return {
    from,
    to,
    left: rect.left - box.left - padX,
    top: top - box.top - padY,
    width: rect.width + padX * 2,
    height: bottom - top + padY * 2,
  };
}

function bandKey(band: Band): string {
  return [band.from, band.to, band.left, band.top, band.width, band.height].join("|");
}

export function sameBands(a: ReadonlyMap<number, Band>, b: ReadonlyMap<number, Band>): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const [index, band] of b) {
    const previous = a.get(index);
    if (previous === undefined || bandKey(previous) !== bandKey(band)) {
      return false;
    }
  }
  return true;
}
