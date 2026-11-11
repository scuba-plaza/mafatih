import { useEffect, useId, useLayoutEffect, useRef } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { FONTS, type FontId } from "~/settings/fonts.ts";
import { isMark } from "~/text/arabic.ts";
import { wordAt } from "~/text/prompt.ts";
import { isComplete, type Session, view } from "./session.ts";
import type { Trainer } from "./useTrainer.ts";

const DONE_HIGHLIGHT = "mafatih-done";
const VISIBLE_SPACE = "\u2423";
const MARK_CARRIER = "\u0640\u0640";
const NARROW_SCREEN_SCALE = "0.1945vw";

interface Block {
  readonly start: number;
  readonly end: number;
}

function blocksOf(session: Session): Block[] {
  const edges = [0, ...session.prompt.breaks, session.prompt.shown.length];
  return edges.slice(0, -1).map((start, index) => ({ start, end: edges[index + 1] ?? start }));
}

function cursorBlock(blocks: readonly Block[], offset: number): number {
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

function caretRect(paragraph: HTMLElement, local: number): DOMRect | undefined {
  const range = document.createRange();
  const mistakes = paragraph.querySelector("[data-mistakes]");
  if (mistakes !== null) {
    range.selectNodeContents(mistakes);
    const lastLine = [...range.getClientRects()].filter((candidate) => candidate.height > 0).at(-1);
    return lastLine === undefined ? undefined : new DOMRect(lastLine.left, lastLine.top, 0, lastLine.height);
  }
  const text = paragraph.firstChild;
  if (!(text instanceof Text)) {
    return undefined;
  }
  const next = text.data.charAt(local);
  if (next !== "" && !isMark(next)) {
    range.setStart(text, local);
    range.setEnd(text, local + 1);
    return edgeOf(range, "start");
  }
  let base = local;
  while (base > 0 && isMark(text.data.charAt(base - 1))) {
    base -= 1;
  }
  range.setStart(text, Math.max(0, base - 1));
  range.setEnd(text, Math.max(local, 1));
  return edgeOf(range, "end");
}

function paintDone(paragraphs: readonly HTMLElement[], blockIndex: number, local: number): void {
  if (typeof CSS === "undefined" || CSS.highlights === undefined) {
    return;
  }
  const first = paragraphs[0];
  const current = paragraphs[blockIndex];
  if (first === undefined || current === undefined) {
    CSS.highlights.delete(DONE_HIGHLIGHT);
    return;
  }
  const range = document.createRange();
  range.setStart(first, 0);
  const mistakes = current.querySelector("[data-mistakes]");
  const text = current.firstChild;
  if (mistakes !== null) {
    range.setEndBefore(mistakes);
  } else if (text instanceof Text) {
    range.setEnd(text, Math.min(local, text.data.length));
  } else {
    range.setEnd(current, 0);
  }
  CSS.highlights.set(DONE_HIGHLIGHT, new Highlight(range));
}

export interface TypingSurfaceProps {
  readonly trainer: Trainer;
  readonly font: FontId;
  readonly fontSize: number;
}

export function TypingSurface({ trainer, font, fontSize }: TypingSurfaceProps) {
  const { t } = useI18n();
  const { session, options, focused, wrongLayout, inputRef, inputProps, focus } = trainer;
  const textRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const caretLine = useRef<number | null>(null);
  const placeRef = useRef<() => void>(() => undefined);
  const nextWordId = useId();

  const { doneUntil, mistakes } = view(session);
  const complete = isComplete(session);
  const blocks = blocksOf(session);
  const current = cursorBlock(blocks, doneUntil);
  const family = FONTS.find((candidate) => candidate.id === font) ?? FONTS[0];
  const flagged = options.requireBackspace ? mistakes !== "" : session.missed;

  useEffect(() => {
    family.load();
  }, [family]);

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
      paintDone(paragraphs, current, doneUntil - block.start);
      const rect = complete ? undefined : caretRect(paragraph, doneUntil - block.start);
      caret.hidden = rect === undefined;
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
        const top = y - (container.clientHeight - rect.height) / 2;
        container.scrollIntoView({ block: "nearest" });
        container.scrollTo({ top, behavior: calm ? "auto" : "smooth" });
      }
      caretLine.current = y;
    };
    placeRef.current = place;
    place();
  });

  useEffect(() => {
    const container = textRef.current;
    if (container === null) {
      return;
    }
    const place = () => placeRef.current();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    document.fonts.addEventListener("loadingdone", place);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", place);
      CSS.highlights?.delete(DONE_HIGHLIGHT);
    };
  }, []);

  return (
    <section
      aria-label={t("typing.text")}
      data-error={flagged ? "" : undefined}
      className="relative rounded-md border border-line bg-surface has-[input:focus]:outline-2 has-[input:focus]:outline-offset-2 has-[input:focus]:outline-focus data-error:border-danger"
    >
      <div
        ref={textRef}
        lang="ar"
        dir="rtl"
        data-lesson-text=""
        className="relative max-h-[60dvh] min-h-24 overflow-y-auto px-4 pt-3 leading-loose wrap-anywhere"
        style={{
          fontFamily: `"${family.family}", serif`,
          fontSize: `calc(${fontSize} * min(1px, ${NARROW_SCREEN_SCALE}))`,
        }}
      >
        {blocks.map((block, index) => (
          <p key={block.start} data-block="">
            {index === current && mistakes !== "" ? (
              <>
                {session.prompt.shown.slice(block.start, doneUntil)}
                <span
                  data-mistakes=""
                  aria-hidden="true"
                  className="inline-block max-w-full text-danger underline decoration-wavy underline-offset-4 [unicode-bidi:isolate]"
                >
                  {drawnMistakes(mistakes)}
                </span>
                {session.prompt.shown.slice(doneUntil, block.end)}
              </>
            ) : (
              session.prompt.shown.slice(block.start, block.end)
            )}
          </p>
        ))}
        <span
          ref={caretRef}
          aria-hidden="true"
          data-caret=""
          className="pointer-events-none absolute top-0 left-0 w-0.5 bg-accent forced-color-adjust-none forced-colors:bg-[CanvasText]"
          hidden
        />
      </div>
      <div className="flex min-h-11 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-sm font-medium">
        {!focused && !complete && (
          <button
            type="button"
            onClick={focus}
            className="rounded-full border border-line px-4 py-1 after:absolute after:inset-0 after:rounded-md"
          >
            {t(session.startedAt === null ? "typing.start" : "typing.continue")}
          </button>
        )}
        <p role="status" className="text-danger">
          {focused && flagged && t(options.requireBackspace ? "typing.mistakeBackspace" : "typing.mistake")}
        </p>
        {wrongLayout && <p role="alert">{t("typing.wrongLayout")}</p>}
      </div>
      <input
        {...inputProps}
        ref={inputRef}
        aria-label={t("typing.inputLabel")}
        aria-describedby={nextWordId}
        disabled={complete}
        tabIndex={-1}
        className="absolute top-1/2 left-1/2 size-px border-0 bg-transparent p-0 text-base text-transparent caret-transparent opacity-0 outline-none"
      />
      <p id={nextWordId} role="status" lang="ar" dir="rtl" className="sr-only">
        {wordAt(session.prompt, doneUntil)}
      </p>
    </section>
  );
}
