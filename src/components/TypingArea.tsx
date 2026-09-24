import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  type Band,
  bandFor,
  type Column,
  type Fit,
  fontAt,
  MARK_GAP_EM,
  MARK_SIZE_EM,
  rangeBetween,
  sameBands,
  widthOf,
} from "~/components/measure.ts";
import { scrollBehavior } from "~/components/ui.ts";
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
  follow?: boolean;
}

const NO_CUTS: readonly AyahCut[] = [];
const NO_BREAKS: readonly number[] = [];
const MARK = "text-sky-600/60 dark:text-sky-400/50";
const MARK_STYLE = { fontSize: `${MARK_SIZE_EM}em`, marginInline: `${MARK_GAP_EM}em` };

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
  follow = true,
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
    const unmoved = previous === null ? cursor === 0 : previous.chars === chars && previous.line === activeIndex;
    if (!follow || line === null || unmoved) {
      return;
    }
    line.scrollIntoView({ block: "center", inline: "nearest", behavior: scrollBehavior() });
  }, [chars, activeIndex, follow]);

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
