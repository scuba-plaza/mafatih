import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitsGuide, OVERFLOW_TOLERANCE, toPixels, wholeLines, windowHeight } from "./stage.ts";

export interface StageFit {
  readonly showGuide: boolean;
  readonly windowHeight: number | null;
}

interface Plan extends StageFit {
  readonly minHeight: number | null;
}

export interface StageParts {
  readonly stage: RefObject<HTMLElement | null>;
  readonly section: RefObject<HTMLElement | null>;
  readonly text: RefObject<HTMLElement | null>;
  readonly guide: RefObject<HTMLElement | null>;
}

function visibleHeight(element: Element): number {
  return getComputedStyle(element).display === "none" ? 0 : element.getBoundingClientRect().height;
}

function planOf(parts: StageParts, wanted: boolean, guide: number, minLines: number): Plan | null {
  const stage = parts.stage.current;
  const section = parts.section.current;
  const text = parts.text.current;
  if (stage === null || section === null || text === null) {
    return null;
  }
  const textStyle = getComputedStyle(text);
  const lineHeight = toPixels(textStyle.lineHeight);
  if (lineHeight <= 0) {
    return null;
  }
  const padTop = toPixels(textStyle.paddingTop);
  const rowGap = toPixels(getComputedStyle(stage).rowGap);
  const guideElement = parts.guide.current;
  const gapAboveGuide = rowGap + (guideElement === null ? 0 : toPixels(getComputedStyle(guideElement).marginTop));
  const below = [...stage.children]
    .filter((child) => child !== section && child !== guideElement)
    .reduce((sum, child) => sum + (visibleHeight(child) > 0 ? visibleHeight(child) + rowGap : 0), 0);
  const shell = stage.closest("[data-shell]");
  const outside = shell === null ? 0 : shell.getBoundingClientRect().height - stage.getBoundingClientRect().height;
  const room = shell === null ? stage.clientHeight : window.innerHeight - outside;
  const showGuide = wanted && fitsGuide({ stage: room, lineHeight, padTop, gapAboveGuide, guide, below });
  const needed = minLines * lineHeight + padTop + below + (showGuide ? gapAboveGuide + guide : 0);
  const minHeight = shell !== null && room < needed ? Math.ceil(outside + needed) : null;
  const available = room - below - (showGuide ? gapAboveGuide + guide : 0);
  if (text.scrollHeight <= available + OVERFLOW_TOLERANCE) {
    return { showGuide, windowHeight: null, minHeight };
  }
  const lines = Math.max(minLines, wholeLines(available, lineHeight, padTop));
  return { showGuide, windowHeight: windowHeight(lines, lineHeight, padTop), minHeight };
}

export function useStageFit(
  parts: StageParts,
  wanted: boolean,
  guide: number,
  minLines: number,
  onMinHeight: (minHeight: number | null) => void,
): StageFit {
  const [fit, setFit] = useState<StageFit>({ showGuide: wanted, windowHeight: null });
  const measureRef = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    measureRef.current = () => {
      const next = planOf(parts, wanted, guide, minLines);
      if (next !== null) {
        onMinHeight(next.minHeight);
        setFit((previous) =>
          previous.showGuide === next.showGuide && previous.windowHeight === next.windowHeight
            ? previous
            : { showGuide: next.showGuide, windowHeight: next.windowHeight },
        );
      }
    };
    measureRef.current();
  });

  useEffect(() => {
    const stage = parts.stage.current;
    if (stage === null) {
      return;
    }
    const measure = () => measureRef.current();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    document.fonts.addEventListener("loadingdone", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("load", measure);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("load", measure);
    };
  }, [parts.stage]);

  return fit;
}
