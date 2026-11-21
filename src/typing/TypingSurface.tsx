import { type ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useReportFitMinHeight } from "~/app/fitScreen.tsx";
import { useChrome } from "~/app/useChrome.ts";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { GUIDE_QUERY, GuideKeyboard, guideHeight } from "~/keyboard/GuideKeyboard.tsx";
import { useLayoutName } from "~/keyboard/useLayoutName.ts";
import { FONTS, loadFont } from "~/settings/fonts.ts";
import type { Settings } from "~/settings/settings.ts";
import { isMark } from "~/text/arabic.ts";
import { wordAt } from "~/text/prompt.ts";
import { useMediaQuery } from "~/ui/useMediaQuery.ts";
import { activatesOnEnter, isOnControl } from "./activation.ts";
import { wordInProgress } from "./ligature.ts";
import { HIGHLIGHT_NAMES, type HighlightName, type PaintRun, paintRuns, type TextSpan } from "./paint.ts";
import { isComplete, type Session, view } from "./session.ts";
import { caretRow, caretScrollTop, MIN_WINDOW_LINES, OVERFLOW_TOLERANCE, toPixels, wholeLines } from "./stage.ts";
import { useStageFit } from "./useStageFit.ts";
import type { Trainer } from "./useTrainer.ts";

const NO_SPANS: readonly TextSpan[] = [];
const VISIBLE_SPACE = "\u2423";
const MARK_CARRIER = "\u0640\u0640";
const NARROW_SCREEN_SCALE = "0.1945vw";
const MISS_RING = "0 0 0 2px var(--color-danger)";
const CARET_IDLE_MS = 250;

const MISS_SHAKE: Keyframe[] = [
  { offset: 0, backgroundColor: "var(--color-danger)", boxShadow: MISS_RING, translate: "0 0" },
  { offset: 0.15, translate: "-5px 0" },
  { offset: 0.3, translate: "5px 0" },
  { offset: 0.45, translate: "-4px 0" },
  { offset: 0.6, backgroundColor: "var(--color-danger)", boxShadow: "0 0 0 0 transparent", translate: "3px 0" },
];

const MISS_STILL: Keyframe[] = [
  { offset: 0, backgroundColor: "var(--color-danger)", boxShadow: MISS_RING },
  { offset: 0.99, backgroundColor: "var(--color-danger)", boxShadow: MISS_RING },
];

function blocksOf(session: Session): TextSpan[] {
  const edges = [0, ...session.prompt.breaks, session.prompt.shown.length];
  return edges.slice(0, -1).map((start, index) => ({ start, end: edges[index + 1] ?? start }));
}

function cursorBlock(blocks: readonly TextSpan[], offset: number): number {
  const index = blocks.findIndex((block) => offset < block.end);
  return index < 0 ? blocks.length - 1 : index;
}

function drawnMistakes(mistakes: string): string {
  return [...mistakes]
    .map((char, index, all) => {
      const before = all[index - 1];
      const carrier = isMark(char) && (before === undefined || before === " ") ? MARK_CARRIER : "";
      return `${carrier}${char === " " ? VISIBLE_SPACE : char}`;
    })
    .join("");
}

function edgeOf(range: Range, side: "start" | "end"): DOMRect | undefined {
  const rect = [...range.getClientRects()].find((candidate) => candidate.height > 0);
  if (rect === undefined) {
    return undefined;
  }
  const x = side === "start" ? rect.right : rect.left;
  return new DOMRect(x, rect.top, 0, rect.height);
}

function textNodesOf(paragraph: HTMLElement): Text[] {
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest("[data-mistakes]") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  const nodes: Text[] = [];
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof Text) {
      nodes.push(node);
    }
  }
  return nodes;
}

function locate(nodes: readonly Text[], local: number, edge: "start" | "end"): readonly [Text, number] | undefined {
  let remaining = local;
  for (const node of nodes) {
    if (edge === "start" ? remaining < node.data.length : remaining <= node.data.length) {
      return [node, remaining];
    }
    remaining -= node.data.length;
  }
  return undefined;
}

function rangeBetween(
  nodes: readonly Text[],
  from: number,
  to: number,
  side: "start" | "end",
): { readonly range: Range; readonly side: "start" | "end" } | undefined {
  const start = locate(nodes, from, "start");
  const end = locate(nodes, to, "end");
  if (start === undefined || end === undefined) {
    return undefined;
  }
  const range = document.createRange();
  range.setStart(...start);
  range.setEnd(...end);
  return { range, side };
}

function caretRect(paragraph: HTMLElement, local: number): DOMRect | undefined {
  const mistakes = paragraph.querySelector("[data-mistakes]");
  if (mistakes !== null) {
    const range = document.createRange();
    range.selectNodeContents(mistakes);
    const lastLine = [...range.getClientRects()].filter((candidate) => candidate.height > 0).at(-1);
    return lastLine === undefined ? undefined : new DOMRect(lastLine.left, lastLine.top, 0, lastLine.height);
  }
  const nodes = textNodesOf(paragraph);
  const data = nodes.map((node) => node.data).join("");
  const next = data.charAt(local);
  if (next !== "" && !isMark(next)) {
    const found = rangeBetween(nodes, local, local + 1, "start");
    return found === undefined ? undefined : edgeOf(found.range, found.side);
  }
  let base = local;
  while (base > 0 && isMark(data.charAt(base - 1))) {
    base -= 1;
  }
  const found = rangeBetween(nodes, Math.max(0, base - 1), Math.max(local, 1), "end");
  return found === undefined ? undefined : edgeOf(found.range, found.side);
}

function highlightRegistry(): HighlightRegistry | undefined {
  return typeof CSS === "undefined" ? undefined : CSS.highlights;
}

function rangeOf(
  nodesByBlock: readonly (readonly Text[])[],
  blocks: readonly TextSpan[],
  run: TextSpan,
): Range | undefined {
  const index = blocks.findIndex((block) => run.start >= block.start && run.end <= block.end);
  const nodes = nodesByBlock[index];
  const offset = blocks[index]?.start ?? 0;
  if (nodes === undefined) {
    return undefined;
  }
  const from = locate(nodes, run.start - offset, "start");
  const to = locate(nodes, run.end - offset, "end");
  if (from === undefined || to === undefined) {
    return undefined;
  }
  const range = document.createRange();
  range.setStart(...from);
  range.setEnd(...to);
  return range;
}

function paint(paragraphs: readonly HTMLElement[], blocks: readonly TextSpan[], runs: readonly PaintRun[]): void {
  const highlights = highlightRegistry();
  if (highlights === undefined) {
    return;
  }
  const ranges = new Map<HighlightName, Range[]>();
  const nodesByBlock = paragraphs.map(textNodesOf);
  for (const run of runs) {
    const range = rangeOf(nodesByBlock, blocks, run);
    if (range !== undefined) {
      ranges.set(run.name, [...(ranges.get(run.name) ?? []), range]);
    }
  }
  for (const name of HIGHLIGHT_NAMES) {
    const painted = ranges.get(name);
    if (painted === undefined) {
      highlights.delete(name);
    } else {
      highlights.set(name, new Highlight(...painted));
    }
  }
}

interface BlockTextProps {
  readonly shown: string;
  readonly block: TextSpan;
  readonly cursor: number;
  readonly mistakes: string;
  readonly active: boolean;
}

function BlockText({ shown, block, cursor, mistakes, active }: BlockTextProps): ReactNode {
  const word = active ? wordInProgress(shown, cursor, block.start, block.end) : null;
  const flagged =
    mistakes === "" ? null : (
      <span data-mistakes="" aria-hidden="true" className="inline-block max-w-full text-danger [unicode-bidi:isolate]">
        {drawnMistakes(mistakes)}
      </span>
    );
  if (word === null) {
    return flagged === null ? (
      shown.slice(block.start, block.end)
    ) : (
      <>
        {shown.slice(block.start, cursor)}
        {flagged}
        {shown.slice(cursor, block.end)}
      </>
    );
  }
  return (
    <>
      {shown.slice(block.start, word.start)}
      <span data-unligated="">
        {shown.slice(word.start, cursor)}
        {flagged}
        {shown.slice(cursor, word.end)}
      </span>
      {shown.slice(word.end, block.end)}
    </>
  );
}

export interface TypingSurfaceProps {
  readonly trainer: Trainer;
  readonly settings: Settings;
  readonly apparatus?: readonly TextSpan[];
  readonly playing?: TextSpan | null;
  readonly describedBy?: string;
  readonly footer?: ReactNode;
}

export function TypingSurface(props: TypingSurfaceProps) {
  const { trainer, settings, apparatus = NO_SPANS, playing = null, describedBy, footer } = props;
  const { font, fontSize } = settings;
  const { t } = useI18n();
  const layoutName = useLayoutName();
  const { session, options, focused, wrongLayout, inputRef, inputProps, focus } = trainer;
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const caretLine = useRef<number | null>(null);
  const placeRef = useRef<() => void>(() => undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const guideRef = useRef<HTMLDivElement>(null);
  const nextWordId = useId();
  const [scrollable, setScrollable] = useState(false);
  const wantsGuide = useMediaQuery(GUIDE_QUERY) && settings.showKeyboard;
  const textOnly = useChrome().chrome === "text-only";
  const reportMinHeight = useReportFitMinHeight();
  const { showGuide, windowHeight } = useStageFit(
    { stage: stageRef, section: sectionRef, text: textRef, guide: guideRef },
    wantsGuide,
    guideHeight(settings.fingerGuide),
    textOnly ? 1 : MIN_WINDOW_LINES,
    reportMinHeight,
  );
  const scrollRegion = scrollable
    ? ({ tabIndex: 0, role: "group", "aria-label": t("typing.scrollable") } as const)
    : {};

  const { doneUntil, mistakes } = view(session);
  const complete = isComplete(session);
  const blocks = blocksOf(session);
  const current = cursorBlock(blocks, doneUntil);
  const family = FONTS.find((candidate) => candidate.id === font) ?? FONTS[0];
  const flagged = options.requireBackspace ? mistakes !== "" : session.missed;
  const paused = !focused && !complete;

  useEffect(() => {
    loadFont(family);
  }, [family]);

  const misses = session.errors + session.ignored;
  const activity = `${doneUntil}:${mistakes}:${misses}:${focused}`;
  const [settled, setSettled] = useState("");
  const idle = settled === activity;

  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(activity), CARET_IDLE_MS);
    return () => window.clearTimeout(timer);
  }, [activity]);

  useEffect(() => {
    const element = caretRef.current;
    if (misses === 0 || element === null) {
      return;
    }
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animation = element.animate(calm ? MISS_STILL : MISS_SHAKE, {
      id: "caret-miss",
      duration: calm ? 600 : 450,
      easing: calm ? "linear" : "ease-out",
    });
    return () => animation.cancel();
  }, [misses]);

  const shownPrompt = useRef(session.prompt);
  useLayoutEffect(() => {
    if (shownPrompt.current !== session.prompt) {
      shownPrompt.current = session.prompt;
      caretLine.current = null;
      textRef.current?.scrollTo(0, 0);
    }
  });

  useLayoutEffect(() => {
    const container = textRef.current;
    const caret = caretRef.current;
    if (container === null || caret === null) {
      return;
    }
    const place = () => {
      const paragraphs = [...container.querySelectorAll<HTMLElement>("[data-block]")];
      const block = blocks[current];
      const paragraph = paragraphs[current];
      if (block === undefined || paragraph === undefined) {
        return;
      }
      paint(paragraphs, blocks, paintRuns({ blocks, doneUntil, apparatus, playing }));
      setScrollable(container.scrollHeight - container.clientHeight > OVERFLOW_TOLERANCE);
      const rect = complete ? undefined : caretRect(paragraph, doneUntil - block.start);
      caret.hidden = !focused || rect === undefined;
      if (rect === undefined) {
        return;
      }
      const frame = container.getBoundingClientRect();
      const x = rect.left - frame.left + container.scrollLeft;
      const y = rect.top - frame.top + container.scrollTop;
      caret.style.transform = `translate(${x}px, ${y}px)`;
      caret.style.height = `${rect.height}px`;
      if (focused && caretLine.current !== y) {
        const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const style = getComputedStyle(container);
        const lineHeight = toPixels(style.lineHeight);
        const padTop = toPixels(style.paddingTop);
        const row = caretRow(wholeLines(container.clientHeight, lineHeight, padTop));
        const top = caretScrollTop(y, rect.height, row, lineHeight, padTop);
        container.scrollIntoView({ block: "nearest" });
        container.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
      }
      caretLine.current = focused ? y : null;
    };
    placeRef.current = place;
    place();
  });

  useEffect(() => {
    const container = textRef.current;
    if (container === null) {
      return;
    }
    const place = () => {
      caretLine.current = null;
      placeRef.current();
    };
    const observer = new ResizeObserver(place);
    observer.observe(container);
    document.fonts.addEventListener("loadingdone", place);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", place);
      for (const name of HIGHLIGHT_NAMES) {
        highlightRegistry()?.delete(name);
      }
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const keepFocus = (event: MouseEvent) => event.preventDefault();
    section?.addEventListener("click", focus);
    section?.addEventListener("mousedown", keepFocus);
    return () => {
      section?.removeEventListener("click", focus);
      section?.removeEventListener("mousedown", keepFocus);
    };
  }, [focus]);

  useEffect(() => {
    if (!paused) {
      return;
    }
    const activate = (event: KeyboardEvent) => {
      const pressed = {
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        repeat: event.repeat,
        isComposing: event.isComposing,
        onControl: isOnControl(event.target),
      };
      if (activatesOnEnter(pressed)) {
        event.preventDefault();
        focus();
      }
    };
    document.addEventListener("keydown", activate);
    return () => document.removeEventListener("keydown", activate);
  }, [paused, focus]);

  return (
    <div ref={stageRef} data-stage="" className="flex min-h-0 flex-1 flex-col justify-center-safe gap-3">
      <section
        ref={sectionRef}
        aria-label={t("typing.text")}
        data-typing-surface=""
        className={`relative flex cursor-text flex-col ${textOnly ? "min-h-[calc(2em+0.75rem)]" : "min-h-[calc(4em+0.75rem)]"}`}
        style={{ fontSize: `calc(${fontSize} * min(1px, ${NARROW_SCREEN_SCALE}))` }}
      >
        <div
          ref={textRef}
          lang="ar"
          dir="rtl"
          data-lesson-text=""
          {...scrollRegion}
          className={`relative min-h-0 ${scrollable ? "overflow-y-auto" : "overflow-y-clip"} [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 pt-3 text-center leading-[2] text-upcoming wrap-anywhere${paused ? " blur-[6px]" : ""}`}
          style={{ fontFamily: `"${family.family}", serif`, height: windowHeight ?? undefined }}
        >
          {blocks.map((block, index) => (
            <p key={block.start} data-block="">
              <BlockText
                shown={session.prompt.shown}
                block={block}
                cursor={doneUntil}
                mistakes={index === current ? mistakes : ""}
                active={index === current}
              />
            </p>
          ))}
          <span
            ref={caretRef}
            aria-hidden="true"
            data-caret=""
            data-pending={mistakes === "" ? undefined : ""}
            data-idle={idle ? "" : undefined}
            className="pointer-events-none absolute top-0 left-0 w-[1.5px] bg-accent forced-color-adjust-none data-pending:bg-danger forced-colors:bg-[CanvasText]"
            hidden
          />
        </div>
        {paused && (
          <button
            type="button"
            tabIndex={-1}
            data-activate=""
            className="absolute top-1/2 left-1/2 z-10 min-h-11 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-surface px-5 text-sm font-medium text-ink"
          >
            <span className="pointer-coarse:hidden">{t("typing.activate")}</span>
            <span className="hidden pointer-coarse:inline">{t("typing.activateTouch")}</span>
          </button>
        )}
        <p role="status" className="sr-only">
          {focused && flagged && t(options.requireBackspace ? "typing.mistakeBackspace" : "typing.mistake")}
        </p>
        {wrongLayout && (
          <p role="alert" className="px-4 py-1 text-center text-sm font-medium">
            {t("typing.wrongLayout", { layout: layoutName })}
          </p>
        )}
        <input
          {...inputProps}
          ref={inputRef}
          aria-label={t("typing.inputLabel")}
          aria-describedby={describedBy === undefined ? nextWordId : `${describedBy} ${nextWordId}`}
          tabIndex={complete ? -1 : undefined}
          data-typing-input=""
          className="absolute top-1/2 left-1/2 size-px border-0 bg-transparent p-0 text-base text-transparent caret-transparent opacity-0 outline-none"
        />
        <p id={nextWordId} role="status" lang="ar" dir="rtl" className="sr-only">
          {wordAt(session.prompt, doneUntil)}
        </p>
      </section>
      {settings.showKeyboard && (
        <GuideKeyboard
          session={session}
          options={options}
          fingerGuide={settings.fingerGuide}
          keyLabels={settings.keyLabels}
          delayedHint={settings.delayedHint}
          paused={paused}
          hidden={!(wantsGuide && showGuide)}
          ref={guideRef}
        />
      )}
      {footer}
    </div>
  );
}
