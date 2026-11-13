export interface TextSpan {
  readonly start: number;
  readonly end: number;
}

export type HighlightName =
  | "mafatih-done"
  | "mafatih-apparatus"
  | "mafatih-done-playing"
  | "mafatih-apparatus-playing"
  | "mafatih-upcoming-playing";

export interface PaintRun extends TextSpan {
  readonly name: HighlightName;
}

export interface PaintInput {
  readonly blocks: readonly TextSpan[];
  readonly doneUntil: number;
  readonly apparatus: readonly TextSpan[];
  readonly playing: TextSpan | null;
}

export const HIGHLIGHT_NAMES: readonly HighlightName[] = [
  "mafatih-done",
  "mafatih-apparatus",
  "mafatih-done-playing",
  "mafatih-apparatus-playing",
  "mafatih-upcoming-playing",
];

function holds(span: TextSpan | null, start: number, end: number): boolean {
  return span !== null && span.start <= start && end <= span.end;
}

function nameOf(sign: boolean, typed: boolean, heard: boolean): HighlightName | null {
  if (sign) {
    return heard ? "mafatih-apparatus-playing" : "mafatih-apparatus";
  }
  if (typed) {
    return heard ? "mafatih-done-playing" : "mafatih-done";
  }
  return heard ? "mafatih-upcoming-playing" : null;
}

export function paintRuns({ blocks, doneUntil, apparatus, playing }: PaintInput): PaintRun[] {
  const length = blocks.at(-1)?.end ?? 0;
  const edges = new Set<number>([0, length, doneUntil]);
  for (const span of [...blocks, ...apparatus, ...(playing === null ? [] : [playing])]) {
    edges.add(span.start);
    edges.add(span.end);
  }
  const cuts = [...edges].filter((edge) => edge >= 0 && edge <= length).sort((a, b) => a - b);
  return cuts.slice(0, -1).flatMap((start, index) => {
    const end = cuts[index + 1] ?? start;
    const name = nameOf(
      apparatus.some((span) => holds(span, start, end)),
      end <= doneUntil,
      holds(playing, start, end),
    );
    return name === null ? [] : [{ name, start, end }];
  });
}
