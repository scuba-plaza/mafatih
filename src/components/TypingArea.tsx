import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { clampFontSize, DEFAULT_FONT_SIZE } from "~/engine/fonts.ts";
import { ayahMark } from "~/engine/format.ts";
import { isHaraka } from "~/engine/layout/ara.ts";
import {
  type Advance,
  type AyahCut,
  chunkIntoLines,
  DEFAULT_LINE_LENGTH,
  type Line,
  type LineSegment,
  lineIndexFor,
  segmentLine,
} from "~/engine/session/lines.ts";

export interface Highlight {
  start: number;
  end: number;
}

export interface TypingAreaProps {
  chars: readonly string[];
  cursor: number;
  errorAt: number | null;
  fontSize?: number;
  highlight?: Highlight | null;
  ayat?: readonly AyahCut[];
  breaks?: readonly number[];
  centered?: Highlight | null;
}

interface Column {
  width: number;
  fontSize: number;
  style: string;
  weight: string;
  family: string;
}

interface Fit {
  limit: number;
  advanceOf: Advance | undefined;
}

interface Band {
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

const NO_CUTS: readonly AyahCut[] = [];
const NO_BREAKS: readonly number[] = [];
const MARK = "text-sky-600/60 dark:text-sky-400/50";
const MARK_SIZE_EM = 0.82;
const MARK_GAP_EM = 0.08;
const MARK_STYLE = { fontSize: `${MARK_SIZE_EM}em`, marginInline: `${MARK_GAP_EM}em` };

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

function widthOf(text: string, font: string): number {
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

function fontAt(column: Column, size: number): string {
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

function rangeBetween(root: ParentNode | null, from: number, to: number): Range | null {
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

function bandFor(root: ParentNode, index: number, from: number, to: number): Band | null {
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

function sameBands(a: ReadonlyMap<number, Band>, b: ReadonlyMap<number, Band>): boolean {
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

function Layer({ segments, marks }: { segments: readonly LineSegment[]; marks: boolean }) {
  return segments.map((segment) => (
    <Fragment key={segment.start}>
      <span {...(marks ? { "data-seg-start": segment.start, "data-seg-end": segment.end } : {})}>{segment.text}</span>
      {segment.ayahEnd === null ? null : (
        <span
          {...(marks ? { "data-cy": "ayah-mark", "data-ayah": segment.ayahEnd } : { "aria-hidden": true })}
          className={MARK}
          style={MARK_STYLE}
        >
          {ayahMark(segment.ayahEnd)}
        </span>
      )}
    </Fragment>
  ));
}

export default function TypingArea({
  chars,
  cursor,
  errorAt,
  fontSize,
  highlight,
  ayat = NO_CUTS,
  breaks = NO_BREAKS,
  centered,
}: TypingAreaProps) {
  const size = clampFontSize(fontSize ?? DEFAULT_FONT_SIZE);
  const [column, setColumn] = useState<Column | null>(null);

  const fit: Fit = useMemo(() => {
    if (column === null) {
      return { limit: DEFAULT_LINE_LENGTH, advanceOf: undefined };
    }
    const font = fontAt(column, column.fontSize);
    if (widthOf("ا", font) <= 0) {
      return { limit: DEFAULT_LINE_LENGTH, advanceOf: undefined };
    }
    const markSize = column.fontSize * MARK_SIZE_EM;
    const markFont = fontAt(column, markSize);
    const gap = markSize * MARK_GAP_EM * 2;
    const cuts = ayat.map((cut) => ({ end: cut.end, width: widthOf(ayahMark(cut.ayah), markFont) + gap }));
    const advanceOf: Advance = (from, to) => {
      let width = widthOf(chars.slice(from, to).join(""), font);
      for (const cut of cuts) {
        if (cut.end > from && cut.end <= to) {
          width += cut.width;
        }
      }
      return width;
    };
    return { limit: column.width, advanceOf };
  }, [column, chars, ayat]);

  const lines: Line[] = useMemo(() => chunkIntoLines(chars, fit.limit, breaks, fit.advanceOf), [chars, fit, breaks]);
  const segments = useMemo(() => lines.map((line) => segmentLine(line, ayat)), [lines, ayat]);
  const activeIndex = lineIndexFor(lines, cursor);
  const activeLine = lines[activeIndex];

  const activeLineRef = useRef<HTMLDivElement>(null);
  const activeTextRef = useRef<HTMLSpanElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [clipLeft, setClipLeft] = useState<number | null>(null);
  const [bands, setBands] = useState<ReadonlyMap<number, Band>>(new Map());
  const [tick, setTick] = useState(0);

  const remeasure = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    window.addEventListener("resize", remeasure);
    document.fonts?.addEventListener("loadingdone", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => undefined);
    return () => {
      window.removeEventListener("resize", remeasure);
      document.fonts?.removeEventListener("loadingdone", remeasure);
    };
  }, [remeasure]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null) {
      return;
    }
    const style = getComputedStyle(root);
    setColumn({
      width: root.clientWidth,
      fontSize: Number.parseFloat(style.fontSize) || size,
      style: style.fontStyle,
      weight: style.fontWeight,
      family: style.fontFamily,
    });
  }, [tick, size, chars]);

  useLayoutEffect(() => {
    const container = activeLineRef.current;
    const span = activeTextRef.current;
    if (!container || !span || activeLine === undefined) {
      setClipLeft(null);
      return;
    }
    const containerRect = container.getBoundingClientRect();
    const startEdge = span.getBoundingClientRect().right - containerRect.left;
    const range = cursor <= activeLine.start ? null : rangeBetween(span, activeLine.start, cursor);
    if (range === null) {
      setClipLeft(startEdge);
      return;
    }
    const rect = range.getBoundingClientRect();
    range.detach();
    setClipLeft(rect.width === 0 ? startEdge : rect.left - containerRect.left);
  }, [cursor, activeIndex, lines, segments, tick, size]);

  const followedRef = useRef<{ chars: readonly string[]; line: number } | null>(null);

  useEffect(() => {
    const previous = followedRef.current;
    followedRef.current = { chars, line: activeIndex };
    const line = activeLineRef.current;
    if (line === null || previous === null || (previous.chars === chars && previous.line === activeIndex)) {
      return;
    }
    const still = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    line.scrollIntoView({ block: "center", inline: "nearest", behavior: still ? "auto" : "smooth" });
  }, [chars, activeIndex]);

  const bandStart = highlight?.start ?? -1;
  const bandEnd = highlight?.end ?? -1;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (root === null || bandEnd <= bandStart) {
      setBands((current) => (current.size === 0 ? current : new Map()));
      return;
    }
    const next = new Map<number, Band>();
    lines.forEach((line, index) => {
      const from = Math.max(line.start, bandStart);
      const to = Math.min(line.end, bandEnd);
      if (to <= from) {
        return;
      }
      const band = bandFor(root, index, from, to);
      if (band !== null) {
        next.set(index, band);
      }
    });
    setBands((current) => (sameBands(current, next) ? current : next));
  }, [bandStart, bandEnd, lines, segments, tick, size]);

  const expected = chars[cursor];
  const ghost = expected !== undefined && isHaraka(expected) ? expected : null;
  const errored = errorAt !== null;

  return (
    <div
      ref={rootRef}
      data-cy="typing-area"
      data-cursor={cursor}
      data-total={chars.length}
      data-state={errored ? "error" : "ok"}
      lang="ar"
      dir="rtl"
      data-font-size={size}
      className="select-none font-arabic leading-[2.1] tracking-normal"
      style={{ fontSize: `min(${size}px, 8vw)` }}
    >
      {lines.map((line, index) => {
        const isActive = index === activeIndex;
        const band = bands.get(index);
        const parts = segments[index] ?? [];
        const isCentered = centered != null && line.start >= centered.start && line.end <= centered.end + 1;
        const clip =
          line.end <= cursor
            ? "inset(0 0 0 0)"
            : line.start >= cursor || clipLeft === null
              ? "inset(0 0 0 100%)"
              : `inset(0 0 0 ${clipLeft}px)`;

        return (
          <div
            key={line.start}
            ref={isActive ? activeLineRef : undefined}
            data-cy="line"
            data-line-index={index}
            data-active={isActive}
            style={{ scrollMarginBottom: "var(--keyboard-dock-inset, 0px)" }}
            data-centered={isCentered}
            className={`relative whitespace-nowrap ${isCentered ? "text-center" : ""}`}
          >
            {band === undefined ? null : (
              <span
                aria-hidden="true"
                data-cy="ayah-band"
                data-line-index={index}
                data-from={band.from}
                data-to={band.to}
                className="pointer-events-none absolute rounded-md bg-sky-500/10 dark:bg-sky-400/10"
                style={{
                  left: `${band.left}px`,
                  top: `${band.top}px`,
                  width: `${band.width}px`,
                  height: `${band.height}px`,
                }}
              />
            )}
            <span
              ref={isActive ? activeTextRef : undefined}
              data-cy="line-untyped"
              className="text-stone-400 dark:text-stone-600"
            >
              <Layer segments={parts} marks={true} />
            </span>
            <span
              aria-hidden="true"
              data-cy="line-typed"
              className="pointer-events-none absolute inset-0 text-stone-900 dark:text-stone-50"
              style={{ clipPath: clip }}
            >
              <Layer segments={parts} marks={false} />
            </span>
            {isActive && clipLeft !== null ? (
              <>
                <span
                  aria-hidden="true"
                  data-cy="caret"
                  data-error={errored ? "true" : "false"}
                  className={`pointer-events-none absolute top-[0.6em] h-[1.1em] w-[3px] rounded-full ${
                    errored ? "bg-red-500" : "animate-pulse bg-sky-500"
                  }`}
                  style={{ left: `${clipLeft}px` }}
                />
                {ghost === null ? null : (
                  <span
                    aria-hidden="true"
                    data-cy="ghost-haraka"
                    data-char={ghost}
                    className="pointer-events-none absolute top-[-0.35em] -translate-x-1/2 text-[0.5em] text-sky-500/70"
                    style={{ left: `${clipLeft}px` }}
                  >
                    {ghost}
                  </span>
                )}
              </>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
