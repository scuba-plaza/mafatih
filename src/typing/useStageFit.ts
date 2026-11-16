import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import { fitsGuide, MIN_WINDOW_LINES, OVERFLOW_TOLERANCE, wholeLines, windowHeight } from "./stage.ts";

export interface StageFit {
  readonly showGuide: boolean;
  readonly windowHeight: number | null;
}

export interface StageParts {
  readonly stage: RefObject<HTMLElement | null>;
  readonly section: RefObject<HTMLElement | null>;
  readonly text: RefObject<HTMLElement | null>;
  readonly guide: RefObject<HTMLElement | null>;
}

function pixels(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function visibleHeight(element: Element): number {
  return getComputedStyle(element).display === "none" ? 0 : element.getBoundingClientRect().height;
}

function planOf(parts: StageParts, wanted: boolean, guide: number): StageFit | null {
  const stage = parts.stage.current;
  const section = parts.section.current;
  const text = parts.text.current;
  if (stage === null || section === null || text === null) {
    return null;
  }
  const textStyle = getComputedStyle(text);
  const lineHeight = pixels(textStyle.lineHeight);
  const padTop = pixels(textStyle.paddingTop);
  const rowGap = pixels(getComputedStyle(stage).rowGap);
  const guideElement = parts.guide.current;
  const gapAboveGuide = rowGap + (guideElement === null ? 0 : pixels(getComputedStyle(guideElement).marginTop));
  const below = [...stage.children]
    .filter((child) => child !== section && child !== guideElement)
    .reduce((sum, child) => sum + (visibleHeight(child) > 0 ? visibleHeight(child) + rowGap : 0), 0);
  const room = stage.clientHeight;
  const showGuide = wanted && fitsGuide({ stage: room, lineHeight, padTop, gapAboveGuide, guide, below });
  const available = room - below - (showGuide ? gapAboveGuide + guide : 0);
  if (text.scrollHeight <= available + OVERFLOW_TOLERANCE) {
    return { showGuide, windowHeight: null };
  }
  const lines = Math.max(MIN_WINDOW_LINES, wholeLines(available, lineHeight, padTop));
  return { showGuide, windowHeight: windowHeight(lines, lineHeight, padTop) };
}

export function useStageFit(parts: StageParts, wanted: boolean, guide: number): StageFit {
  const [fit, setFit] = useState<StageFit>({ showGuide: wanted, windowHeight: null });
  const measureRef = useRef<() => void>(() => undefined);

  useLayoutEffect(() => {
    measureRef.current = () => {
      const next = planOf(parts, wanted, guide);
      if (next !== null) {
        setFit((previous) =>
          previous.showGuide === next.showGuide && previous.windowHeight === next.windowHeight ? previous : next,
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
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", measure);
    };
  }, [parts.stage]);

  return fit;
}
