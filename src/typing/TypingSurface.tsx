import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useI18n } from "~/i18n/I18nProvider.tsx";
import { FONTS, type FontId } from "~/settings/fonts.ts";
import { isMark } from "~/text/arabic.ts";
import { isComplete, type Session, view } from "./session.ts";
import type { Trainer } from "./useTrainer.ts";

const DONE_HIGHLIGHT = "mafatih-done";
const FLASH_MS = 300;
const VISIBLE_SPACE = "\u2423";

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

function edgeOf(range: Range, side: "start" | "end"): DOMRect | undefined {
  const rect = [...range.getClientRects()].find((candidate) => candidate.height > 0);
  if (rect === undefined) {
    return undefined;
  }
  const x = side === "start" ? rect.right : rect.left;
  return new DOMRect(x, rect.top, 0, rect.height);
}

function caretRect(paragraph: HTMLElement, local: number): DOMRect | undefined {
  const mistakes = paragraph.querySelector("[data-mistakes]");
  if (mistakes !== null) {
    const rect = mistakes.getBoundingClientRect();
    return new DOMRect(rect.left, rect.top, 0, rect.height);
  }
  const text = paragraph.firstChild;
  if (!(text instanceof Text)) {
    return undefined;
  }
  const range = document.createRange();
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
  readonly announcement?: string;
}

export function TypingSurface({ trainer, font, fontSize, announcement }: TypingSurfaceProps) {
  const { t } = useI18n();
  const { session, options, focused, wrongLayout, inputRef, inputProps, focus } = trainer;
  const { requireBackspace } = options;
  const textRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLSpanElement>(null);
  const caretLine = useRef<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [mistakeAnnouncement, setMistakeAnnouncement] = useState("");

  const { doneUntil, mistakes } = view(session);
  const complete = isComplete(session);
  const blocks = blocksOf(session);
  const current = cursorBlock(blocks, doneUntil);
  const family = FONTS.find((candidate) => candidate.id === font) ?? FONTS[0];
  const { lastError } = session;
  const errorAt = lastError?.at;

  useEffect(() => {
    family.load();
  }, [family]);

  useEffect(() => {
    if (errorAt === undefined) {
      return;
    }
    setFlash(true);
    setMistakeAnnouncement((before) => {
      const message = t(requireBackspace ? "typing.mistakeBackspace" : "typing.mistake");
      return before === message ? `${message}\u00A0` : message;
    });
    const timer = window.setTimeout(() => setFlash(false), FLASH_MS);
    return () => window.clearTimeout(timer);
  }, [errorAt, requireBackspace, t]);

  useLayoutEffect(() => {
    const container = textRef.current;
    const caret = caretRef.current;
    if (container === null || caret === null) {
      return;
    }
    const place = () => {
      const paragraphs = [...container.querySelectorAll<HTMLElement>("[data-block]")];
      const sessionBlocks = blocksOf(session);
      const done = view(session).doneUntil;
      const index = cursorBlock(sessionBlocks, done);
      const block = sessionBlocks[index];
      const paragraph = paragraphs[index];
      if (block === undefined || paragraph === undefined) {
        return;
      }
      paintDone(paragraphs, index, done - block.start);
      const rect = isComplete(session) ? undefined : caretRect(paragraph, done - block.start);
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
    place();
    const observer = new ResizeObserver(place);
    observer.observe(container);
    document.fonts.addEventListener("loadingdone", place);
    return () => {
      observer.disconnect();
      document.fonts.removeEventListener("loadingdone", place);
    };
  }, [session, focused]);

  useEffect(
    () => () => {
      CSS.highlights?.delete(DONE_HIGHLIGHT);
    },
    [],
  );

  return (
    <section
      aria-label={t("typing.surfaceLabel")}
      data-error={flash ? "" : undefined}
      className="relative rounded-md border border-line bg-surface focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus data-error:border-danger"
    >
      <div
        ref={textRef}
        lang="ar"
        dir="rtl"
        data-lesson-text=""
        className="relative max-h-[60dvh] min-h-24 overflow-y-auto px-4 py-3 leading-loose"
        style={{ fontFamily: `"${family.family}", serif`, fontSize: `min(${fontSize}px, 8vw)` }}
      >
        {blocks.map((block, index) => (
          <p key={block.start} data-block="">
            {index === current && mistakes !== "" ? (
              <>
                {session.prompt.shown.slice(block.start, doneUntil)}
                <span
                  data-mistakes=""
                  aria-hidden="true"
                  className="inline-block whitespace-pre text-danger underline decoration-wavy underline-offset-4 [unicode-bidi:isolate]"
                >
                  {mistakes.replaceAll(" ", VISIBLE_SPACE)}
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
          className="pointer-events-none absolute top-0 left-0 w-0.5 bg-accent"
          hidden
        />
      </div>
      <input
        {...inputProps}
        ref={inputRef}
        aria-label={t("typing.inputLabel")}
        className="absolute top-1/2 left-1/2 size-px border-0 bg-transparent p-0 text-base text-transparent caret-transparent opacity-0 outline-none"
      />
      {!focused && !complete && (
        <button
          type="button"
          onClick={focus}
          className="absolute inset-0 flex items-end justify-center rounded-md pb-3"
        >
          <span className="rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-sm">
            {t(session.startedAt === null ? "typing.start" : "typing.continue")}
          </span>
        </button>
      )}
      {wrongLayout && (
        <p role="alert" className="border-t border-line px-4 py-2 text-sm font-medium">
          {t("typing.wrongLayout")}
        </p>
      )}
      <p role="status" className="sr-only">
        {announcement ?? mistakeAnnouncement}
      </p>
    </section>
  );
}
